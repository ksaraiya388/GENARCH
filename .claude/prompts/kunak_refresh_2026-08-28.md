# CORRECTIONS TO THIS BRIEF, recorded 2026-08-30

Four of this brief's amendment premises were refuted while it was being
executed. They are recorded here rather than in the execution report alone,
because the brief is the instruction and a reader who finds it later should not
have to reconstruct which of its premises held.

The corrections were made **during execution, against the brief**, by checking
each premise before acting on it. A record that contains corrected errors is
stronger evidence of method than a clean one: it shows the premises were tested
rather than assumed.

| Amendment | Premise as written | What was found |
|---|---|---|
| **A.5** | DEQ's published site names should be used in public-facing artifacts | Cannot be applied. Four of the sites are hosted at schools, and `docs/CONTENT_CONSTRAINTS.md` section 4 forbids a school name within 200 characters of a reading value, enforced by `SCHOOL_RE` in `scripts/check-constraints.mjs`. The slug labelling on the public pages is the deliberate compliance measure. A.5 is satisfied in the `outputs/repro/` artifacts instead, which sit outside the lint scope and do use DEQ's published names |
| **A.7** | No prior report editions are archived, so the historical figures cannot be checked | False. Three prior editions are archived at `docs/deq-reports/` (2026-08-07, 08-14, 08-21) and the fourth at `pipeline/sources/deq/`. All twelve `sterling-ms` figures and all four editions' collocation coefficients were extracted from those PDFs and reproduce exactly |
| **A.9 / A.12** | The stored APEX 5 NO2 figure is an unsourced inconsistency and should be treated as superseded | Wrong. The zeros-retained treatment on that regression is DEQ correspondence dated 2026-08-19, deliberately scoped to that one comparison, with the corrected coefficients and the paired hourly data attached. The scoping is load-bearing: extending it breaks the two regressions that currently reproduce, moving APEX 14 PM2.5 intercept to 1.368 against a published 1.3 and APEX 14 NO2 R² to 0.549 against a published 0.49 |
| **A.15** | `unit_id` disagrees with DEQ at the 2026-04-08 swap boundary because `shift_hours` is 1, putting two hours on the wrong day | Mechanism wrong. `shift_hours` is 2, so the two boundary hours fall on 2026-04-08 in raw local time and the pipeline's `apex-05` label agrees with DEQ. DEQ's own supplied data for that regression begins at `ts_est` 2026-04-07 22:00, which confirms it. No boundary defect exists |

A fifth premise was corrected by the consolidation task that followed this one:
this brief described the p98 divergence against DEQ's Table 4 as "1 to 2 ug/m3
above DEQ's" and suspected exact-zero treatment as the cause. Both are wrong.
The divergence is bidirectional, −0.89 to +2.12, and its cause is the day
boundary rather than zero treatment. See `docs/PERCENTILE_METHOD.md`.

---

# TASK: Refresh DEQ Kunak hourly export to the 2026-08-28 report period and revalidate every dependent claim

## Context you need before doing anything

GENARCH reproduces Virginia DEQ Data Center Air Monitoring Project (DCAMP)
analysis from raw sensor data. The repo currently holds reproductions computed
against an 2026-08-10 data cutoff. DEQ published a new weekly report on
2026-08-28 covering sensor data through 2026-08-27. That report is already
ingested at pipeline/sources/deq/deq_dcamp_weekly_2026-08-28.pdf with extracted
sidecars (.txt, _tables.json) and a manifest entry.

Two findings in the repo changed status with that report and you must handle
this correctly rather than mechanically:

1. The Aug 7 report's Table 4 named Sterling MS as the only site whose daily
   PM2.5 98th percentile exceeded 35.0 ug/m3. The Aug 28 Table 4 shows no site
   above 35.0; Sterling MS is 33.8. The series across four consecutive reports
   is 40.4 -> 38.2 -> 36.0 -> 33.8. The record-length artifact resolved on its
   own. GENARCH can no longer claim to correct a live DEQ statement. The
   surviving claim is methodological: comparing 98th percentiles across records
   of unequal length and unequal seasonal coverage produces rankings that are
   artifacts of window, evidenced by a documented prediction that resolved.

2. Only two of the four collocation regressions are on closed windows. APEX 14
   was collocated at Broad Run HS 2026-03-03 to 2026-04-08 (closed; both its
   regressions are fixed permanently). APEX 5 has been collocated 2026-04-08 to
   present (open; both its regressions recompute every week). The phrase "three
   exact, one near" was a snapshot of an unstable comparison and must not
   appear anywhere in the repo after this task.

DEQ publishes coefficients at two significant figures. Any claim of
reproduction "to three decimals" is unverifiable against the source and must be
restated as rounding to DEQ's published values at DEQ's published precision.

## Published values you are reproducing against (2026-08-28 report)

Collocation, Broad Run HS:
  NO2   APEX 14 (closed): y = 2.2 + 1.1 x,   R2 = 0.49
  NO2   APEX 5  (open):   y = 1.7 + 0.31 x,  R2 = 0.21
  PM2.5 APEX 14 (closed): y = 1.3 + 0.83 x,  R2 = 0.73
  PM2.5 APEX 5  (open):   y = -5 + 1.6 x,    R2 = 0.82

Table 4, daily PM2.5 statistical summary (mean, sd, median, p98):
  1757 Golf Club                   7.6   9.3   5.4   23.4
  Belfort Park Dr                  9.3  10.3   7.3   25.9
  Broad Run HS                     8.3   8.3   6.8   24.8
  Broad Run HS Regulatory Monitor  8.2  15.3   6.0   22.3
  Dulles Airport                   5.8   7.0   4.1   17.8
  Farmwell Station MS              8.2  10.3   6.1   24.6
  Heritage Farm Museum             4.2   2.3   3.5    9.7
  Sterling MS                     10.5  12.0   8.4   33.8
  Steuart Weller ES                4.6   2.4   3.9   10.2
  (one row between Heritage Farm and Sterling MS was truncated in an earlier
   grep; read it from the tables JSON and include it)

Record start dates stated in the report:
  Broad Run HS, Dulles Airport, Heritage Farm Museum,
  Steuart Weller ES, Newberry Condo Assoc.  2026-03-03
  1757 Golf Course, Farmwell Station MS      2026-04-08
  Belfort Park Dr                            2026-05-14
  Sterling MS                                2026-06-18
  Ends: Newberry Condo 2026-05-14; Steuart Weller ES and
        Heritage Farm Museum 2026-06-18
  PM2.5 sensor data 2026-03-03 to 2026-03-08 voided by DEQ (humidity)
  Arlington regulatory CO voided 2026-03-31 to 2026-04-07
  Broad Run HS regulatory PM2.5 voided 2026-05-07 to 2026-05-10
  Valid daily average requires at least 18 of 24 hours

## PHASE 0 — Refuse-to-proceed gates

Run these first. If any fails, stop and report; do not attempt a workaround.

0.1 Confirm pipeline/sources/incoming/ contains new Kunak CSVs. If empty, stop.
0.2 Parse each incoming CSV header. Compare delimiter, column names, and
    timestamp format against the existing files in pipeline/sources/. Report any
    difference. If the delimiter or timestamp convention differs, stop.
0.3 Read the max timestamp per site from the incoming files. If any site's max
    is not later than the current pipeline output for that site, stop and report
    which sites did not advance.
0.4 Report the current end date of the regulatory monitor .xls files. If it is
    earlier than 2026-08-27, note that all collocation recomputes are capped at
    that date and carry the cap into every output. Do not extrapolate.
0.5 Confirm git working tree is clean apart from the already-staged Aug 28
    report files. If there are unrelated uncommitted changes, stop.

## PHASE 1 — Ingest

1.1 Snapshot current pipeline outputs to outputs/repro/pre_refresh_2026-08-28/
    so the diff in Phase 2 has a baseline. Copy, do not move.
1.2 Move incoming CSVs into pipeline/sources/ using the existing naming
    convention. Read the convention from the files already there; do not invent
    one.
1.3 Add a manifest.json entry for each new file: filename, origin_url (Kunak
    dashboard), download_date, license (redistributable with credit to Virginia
    DEQ), attribution, format, sha256, size_bytes, description,
    expected_columns. Match the shape of existing entries exactly.
1.4 If DEQ's published dailyAvg file was also refreshed, ingest it the same way
    and record which report period it corresponds to.

## PHASE 2 — Rerun and diff

2.1 Run: python -m pipeline.reshape_deq
2.2 Diff every output file against the Phase 1.1 snapshot. Write the diff
    summary to outputs/repro/reshape_delta_2026-08-28.md, covering:
      - row counts per site, before and after
      - excluded-row counts and percentages per site per pollutant, before and
        after, with any reason category that appeared or disappeared
      - exact-zero counts and max run lengths, before and after
      - missing-hour lists, before and after
      - daily reconciliation: comparable days and exact-after-truncation count,
        before and after, and every new mismatch by date with both values
2.3 The 2026-03-10 mismatch (recomputed 5.0, published 5.2) was resolved
    previously via DEQ correspondence, which confirmed 5.0 recomputes from
    hourly data. If it persists, leave it and note the prior resolution. If it
    changed, flag it prominently.
2.4 Sterling MS is expected to grow from 1307 rows toward roughly 1680 for
    2026-06-18 through 2026-08-27. If it lands far off that, investigate before
    continuing.

## PHASE 3 — Recompute the four claims

Write each to its own CSV under outputs/repro/ with the report date in the
filename. Every output must carry the data cutoff date as a column or header,
not just in prose.

3.1 Collocation, Broad Run HS sensor vs regulatory monitor, hourly pairs.
    Compute all four regressions. For each, emit: intercept, slope, R2, n pairs,
    window start, window end, window_status (closed or open), the DEQ published
    value, and whether your value rounds to DEQ's at DEQ's precision (two
    significant figures). Use the same validity filtering the pipeline already
    applies; do not introduce new exclusions here.
    Expect APEX 14 to match as before. Expect APEX 5 to have moved.
    Output: outputs/repro/collocation_2026-08-28.csv

3.2 Daily reconciliation against DEQ's published dailyAvg file. Emit per-day
    rows: date, site, recomputed value, published value, delta, valid hour count.
    Report comparable-day count, exact-after-truncation count, and mean absolute
    delta. Output: outputs/repro/daily_reconciliation_2026-08-28.csv

3.3 Common-window daily PM2.5 98th percentile. The common window is the
    intersection of all six currently-operating sensors' records: 2026-06-18
    through the data cutoff. Emit per site: p98, n valid days, window start,
    window end, rank. Also emit each site's full-record p98 alongside DEQ's
    published Table 4 value and the delta.
    Analytical caution to state in the output header: the common window is
    entirely high summer and contains the 2026-07-16 to 2026-07-19 wildfire
    period, so a common-window comparison is not a clean control either. It
    removes the unequal-length confound and leaves the unequal-seasonality
    confound in place. Do not describe it as correcting for record length
    without that qualification.
    Output: outputs/repro/p98_common_window_2026-08-28.csv

3.4 Offset investigation. GENARCH full-record daily values have run roughly
    1 to 2 ug/m3 above DEQ's, suspected to originate from treating exact-zero
    sensor readings as missing. Recompute the per-site mean delta against DEQ's
    Table 4 under two zero-treatment policies: zeros excluded (current) and
    zeros retained. Report both. Do not change the pipeline's default treatment
    in this task; the pipeline decision is documented in the repo and changing
    it is a separate, reviewed decision.
    Output: outputs/repro/zero_treatment_sensitivity_2026-08-28.csv

## PHASE 4 — Audit for superseded claims

4.1 Search the entire repo (site/, data/, docs/, content/, README, CITATION.cff,
    any MDX, any chart caption, any component string) for every one of:
      - "three exact" / "one near" / any variant of the four-regression claim
      - "only sensor" / "only site" / "sole site" in a Table 4 context
      - the numbers 40.4, 38.2, 36.0, 45.40, 40.19, 40.12, 38.21, 37.10, 29.50
      - "record-length artifact" and any phrasing that presents it as correcting
        a current DEQ statement
      - "three decimals" or any precision claim about the collocation reproduction
      - any present-tense statement of a reproduction figure without a stated
        report date and data cutoff
    Emit outputs/repro/superseded_claims_audit_2026-08-28.csv with columns:
    file path, line number, matched text, claim category, required action.
4.2 Do not edit anything in Phase 4. Audit only.

## PHASE 5 — Rewrite

Apply edits only to items the Phase 4 audit flagged. For each:

5.1 Every reproduction figure gets an explicit report date and data cutoff in
    the same sentence or the adjacent caption. No bare numbers.
5.2 The Table 4 finding is rewritten as: on DEQ's 2026-08-07 report, Table 4
    named Sterling MS as the only site whose daily PM2.5 98th percentile
    exceeded 35.0 ug/m3; that site had 51 days of record against 84 to 152 for
    the others, and its window fell entirely in high summer including the
    2026-07-16 to 2026-07-19 wildfire period; GENARCH identified this as an
    artifact of record length and predicted the figure would fall as the record
    grew; across the four reports the value went 40.4, 38.2, 36.0, 33.8, and as
    of the 2026-08-28 report no site exceeds 35.0. State plainly that this is a
    methodological point about percentile comparison across unequal records, not
    a correction of a standing DEQ error.
5.3 The collocation claim is rewritten to distinguish closed from open windows,
    with APEX 14 described as fixed and APEX 5 as recomputing weekly, and with
    the precision claim restated as rounding to DEQ's published two significant
    figures. Delete "three exact, one near" wherever it appears.
5.4 Add the wind-direction material from the Aug 28 report to the
    /community/data-center-alley page: DEQ states that winds during the study
    period came predominantly from the south or northwest, and that DEQ
    considers its Broad Run HS and Dulles sites good upwind sites with respect
    to Data Center Alley. Attribute to DEQ as DEQ's own characterization of its
    network geometry. Do not extend it into any inference about which sites are
    downwind of which facilities.
5.5 Record, in docs/ only and not on any public page, the internal inconsistency
    in the 2026-08-28 report: Section 4 states the PM2.5 standards correctly
    (98th percentile of 24-hour averages not to exceed 35.0 ug/m3 averaged over
    three years, plus a separate annual standard), while the Section 5
    conclusion refers to a "24-hr (daily) average PM2.5 NAAQS limit of
    9.0 ug/m3". There is no 9.0 daily limit; 9.0 is the annual primary standard
    from the 2024 revision, and the values exceeding it in that table are the
    mean column. Record it as an observation for correspondence. Do not publish
    it, do not adopt DEQ's Section 5 wording anywhere, and do not characterize
    it as an error on any public page.

## PHASE 6 — Constraint enforcement

Every artifact touched in Phase 5 must satisfy all of the following before the
task is complete. Check each explicitly and report the check, not just the fix.

6.1 No causal claims. Co-location and mechanism only, stated in the first
    paragraph of every artifact.
6.2 No specific facility named as harming specific people. Corridor, not company.
6.3 Low-cost-sensor limitations and the fact that most readings sit below NAAQS
    stated prominently and first.
6.4 No policy position on data centers.
6.5 Population-level only. No individual risk, no diagnosis.
6.6 Explicit ecological-fallacy disclosure wherever tract-level exposure and
    tract-level prevalence appear together.
6.7 The DEQ sensor limitation language appears verbatim, attributed to DEQ, in
    every limitations box, chart caption, and artifact touching this sensor data:
    "The sensors used in this project are not regulatory instruments as
    specified in the Code of Federal Regulations. They cannot be used in
    determining attainment or non-attainment of the National Ambient Air Quality
    Standards. Only Federal Reference/Equivalent Method designated monitors can."
    Paired with: a single hourly reading above 35 ug/m3 is not an exceedance of
    the 24-hour standard, whose regulatory form is a 98th-percentile value
    averaged over three years; the separate annual standard is 9.0 ug/m3 as of
    the 2024 revision.
6.8 Run the existing constraint lint and report the tiered lexicon result
    against the ratchet baseline. The baseline must not regress.
6.9 All prose written or edited in this task must pass humanizer-skill
    standards: no significance inflation, no em-dash overuse, no promotional
    tone, no fragmented-header filler, full sentences that flow rather than
    short artificial ones.

## PHASE 7 — Gates

All must pass. Report each result explicitly.

  python -m pipeline.reshape_deq        exit 0
  python -m pipeline.validate           exit 0
  python -m ruff check pipeline/        exit 0   (ruff is not on PATH; use -m)
  cd site && npx tsc --noEmit           exit 0
  cd site && npm run build              exit 0

Note in the report, without fixing: pipeline.validate emits a citation gap
manifest at docs/CITATION_GAPS.csv, currently 628 rows, with 160 graph edges
asserting high or medium confidence against empty or placeholder-only sources.
That is out of scope here and blocks public display of per-step confidence
badges. Report the current counts so the trend is tracked.

## PHASE 8 — Report

Write outputs/repro/refresh_report_2026-08-28.md containing: the Phase 2 delta
summary, all four Phase 3 results with their published comparisons, the Phase 4
audit counts by category, a list of every file edited in Phase 5, the Phase 6
constraint check results, the Phase 7 gate results, and an explicit list of any
claim that could not be recomputed and why.

Stage all changes. Do not commit. Do not push.

## PROHIBITIONS

- Do not modify pipeline/reshape_deq.py. If the new export cannot be processed
  by the existing pipeline, stop and report the reason.
- Do not change the exact-zero treatment policy. Phase 3.4 measures sensitivity
  to it; it does not change it.
- Do not introduce new exclusion rules, validity filters, or smoothing.
- Do not delete or overwrite any existing file in pipeline/sources/. New data
  goes in as new files.
- Do not edit the DEQ report PDF, its extracted .txt, or its _tables.json.
- Do not restate any figure computed before this refresh as current.
- Do not fill a gap with an estimate, an interpolation, or a value carried
  forward from a prior report. Report the gap.
- Do not fix the citation manifest, the canvas backing-store resolution issue,
  or the mojibake in node summaries. Out of scope.
- Do not commit or push.
- Do not write any outreach material, email, post, or press copy.

## ACCEPTANCE

The task is complete when: the pipeline reproduces from the refreshed export
with a documented delta; all four analytical claims are recomputed and written
to dated CSVs carrying their data cutoff; the superseded-claims audit is empty
on a second pass; every constraint in Phase 6 is checked and reported; all
Phase 7 gates exit 0; the Phase 8 report exists; and nothing is committed.

## AMENDMENTS (added after Phase 0 inspection on 2026-08-28)

A.1 The pre-refresh data cutoff is 2026-08-10, not Aug 7. Regulatory monitor
    (site_id "ashburn") ends 2026-08-10 23:00; sensors end 2026-08-10 21:00;
    DEQ published dailyAvg ends 2026-08-09 and covers site_id "ashburn" only.

A.2 The regulatory monitor cannot be extended in this task. FOIA 26-4646 covered
    through 2026-08-10 and a follow-up request is pending. Phase 3.1 collocation
    is therefore capped at 2026-08-10 and cannot reproduce the 2026-08-28
    published APEX 5 values. Compute it anyway, label every APEX 5 row
    "capped at 2026-08-10, not comparable to the 2026-08-28 report", and state
    the cap in the output header. Do not extrapolate.

A.3 Phase 3.2 daily reconciliation is capped at 2026-08-09 for the same reason.
    Report it as capped rather than as a current result. Note explicitly in the
    output that this reconciliation compares GENARCH's recomputed daily averages
    of the REGULATORY FEM monitor against DEQ's published daily averages for
    that monitor. It is not a sensor reconciliation and must not be described
    as one anywhere in the repo.

A.4 Before Phase 3.1, read scripts/collocation_window_sweep.py and its output.
    It tests whether the historical APEX 5 near-miss is explained by comparing
    a GENARCH figure computed through 2026-08-10 against a report whose data
    ended several days earlier. If the sweep shows APEX 5 matching the
    2026-08-07 published values at an earlier cutoff, record that as the
    explanation and remove any repo text describing the APEX 5 difference as
    unexplained. If it does not, say so plainly and leave the discrepancy open.

A.5 site_id "ashburn" in GENARCH corresponds to DEQ's "Broad Run HS", and
    "ashburn-collocated" to the APEX sensor at that site. Internal slugs must
    never appear in public-facing artifacts; use DEQ's published site names so
    a reader can find them in the report.

A.6 The 2026-08-28 report states APEX 14 was collocated at Broad Run HS from
    2026-03-03 to 2026-04-08, and separately that the APEX 14 sensor at Newberry
    Condo Assoc. moved to Belfort Park Dr. on 2026-05-14. This bears on the
    open apex-14 unit conflict where ashburn-collocated and newberry-condo both
    claim the unit for 2026-03-03 to 2026-04-08. Report whether the report's
    timeline resolves the conflict. Do not change any unit assignment in this
    task; report only.

A.7 Prior DEQ weekly reports are not archived in the repo. The 40.4 / 38.2 /
    36.0 / 33.8 Sterling MS series and the 2026-08-07 published collocation
    coefficients are currently sourced from notes rather than from documents.
    In Phase 8, list every claim that rests on an unarchived report so the gap
    is visible.

A.8 The window-mismatch hypothesis in A.4 is REFUTED. The cutoff sweep shows
    APEX 5 coefficients flat across 2026-08-05 to 2026-08-10 (intercept moves
    0.009, slope 0.002, R2 0.002 on n approx 2300). Do not attribute the
    historical APEX 5 near-miss to window mismatch. Remove any repo text that
    offers that explanation.

A.9 BLOCKING. The stored collocation reproductions do not reproduce from
    current pipeline data for NO2. Stored: APEX 14 NO2 2.20/1.065/0.491 and
    APEX 5 NO2 1.84/0.316/0.205. A direct regression on ts_est-paired,
    excluded-filtered data gives 2.186/1.0745/0.4965 and 1.661/0.3397/0.1990.
    Both PM2.5 regressions reproduce to three decimals; both NO2 regressions do
    not, including APEX 14 which is a closed window where no cutoff choice can
    account for the difference. NO2 carries 780 exact-zero exclusions at
    ashburn-collocated against 53 for PM2.5, so a zero-treatment difference is
    the leading suspect.
    Before any Phase 3.1 output is written, read scripts/collocation_policy_sweep.py
    and its results. Determine which exclusion and zero-treatment policy
    reproduces the four stored values. If one does, implement that policy
    explicitly in the collocation computation and document it. If none does,
    treat the stored NO2 values as unsourced, recompute them, and list them in
    the Phase 4 audit as figures that must be replaced everywhere they appear.
    Do not publish, restate, or carry forward the stored NO2 coefficients until
    this is settled.

A.10 The stored APEX 5 PM2.5 value matches a 2026-08-07 cutoff, not 2026-08-10.
    Stored reproductions therefore carry no recorded data cutoff. Every value
    written in this task must carry its cutoff in the output file, not in prose.

A.11 RESOLVES A.9. Method identified: pair on ts_est, apply the excluded flag on
    both sides, assign collocation periods by date (APEX 14 2026-03-03 to
    2026-04-08, APEX 5 2026-04-08 onward) rather than by unit_id, OLS with
    sensor on x. Written up in docs/COLLOCATION_METHOD.md. Implement exactly
    this in Phase 3.1. Do not pair on ts_raw. Do not select by unit_id.

A.12 The stored APEX 5 NO2 figure 1.84 / 0.316 / 0.205 reproduces only under a
    zeros-retained policy and is inconsistent with the other three stored
    figures. Treat it as superseded. Add it to the Phase 4 audit as a figure to
    replace wherever it appears.

A.13 New supporting result. The APEX 14 NO2 closed window discriminates
    zero-treatment policy: excluding exact zeros gives R2 0.4908, retaining them
    gives 0.5442, a gap of 0.053 against a leave-one-out spread of 0.025. This
    is directional support for the exact_zero_floor decision. Do not present it
    as a precise match to DEQ's published 0.49 and do not present it as proof
    DEQ applies the same rule. Record the NO2-only limitation.

A.14 The APEX 14 NO2 R2 match is NOT robust. Leave-one-out gives 0.4784 to
    0.5031 around a full-sample 0.4908; removing single observations pushes it
    above the 0.4950 rounding boundary. The intercept and slope do reproduce.
    Any artifact stating the APEX 14 NO2 reproduction must say the coefficients
    reproduce and the R2 is boundary-sensitive. Do not count it as a clean
    reproduction anywhere.

A.15 NEW DEFECT, report only, do not fix. Date-window and unit_id selection
    differ by two paired NO2 rows at ts_est 2026-04-07 22:00 and 23:00, labeled
    apex-05 by the pipeline. With hour-ending Kunak stamps and shift_hours = 1
    these originate at ts_raw 2026-04-07 23:00 and 2026-04-08 00:00, spanning
    the swap boundary, and DEQ places APEX 14 at Broad Run HS through
    2026-04-08. The pipeline's unit_id contradicts the report at swap
    boundaries. Same class as the open apex-14 unit conflict. In Phase 8, list
    every documented sensor swap date and report how many rows within 24 hours
    of each carry a unit_id inconsistent with DEQ's stated timeline.

A.19 CORRECTION to Phase 1.2. Raw Kunak exports live in
    pipeline/sources/deq-raw/, not pipeline/sources/, under the convention
    {site_slug}_multi_{range_start}_{range_end}.csv where range_start is the
    requested start (2026-03-03 for every site, including sites whose data begins
    later) and range_end is the last data date. New files are named
    {slug}_multi_2026-03-03_2026-08-28.csv. The incoming/ directory is not used.

A.20 BLOCKING CHECK. Both the 2026-08-10 and 2026-08-28 export sets may be
    present in deq-raw/ simultaneously. Determine whether reshape_deq globs the
    directory or reads an explicit file list. If it globs, every overlapping hour
    ingests twice and dedup counts, exclusion percentages, and all downstream
    figures are wrong. The project already has a convention for this: a
    _superseded/ subfolder under deq-raw/. Superseded raw files move there rather
    than being deleted. Confirm _superseded/ is itself excluded from any glob.

A.21 The FOIA cap covers both the collocation and the reconciliation. All four
    files in pipeline/sources/deq-regulatory/ (AshburnNO2_hourly,
    AshburnPM2.5, AshburnPM2.5_dailyAvg, AuroraHillsCO_hourly, all
    030326_081026.xls) end 2026-08-10 and came from FOIA 26-4646. One follow-up
    request extending that range lifts both caps in A.2 and A.3. Record it in the
    Phase 8 report as the single blocking external dependency.

A.22 A parallel working copy exists at C:\Users\sarai\genarch-scratch\deq-raw\
    mirroring the repo's raw exports. It is outside the repo and is not the
    source of truth. Do not read from it, write to it, or reconcile against it.

A.24 RESOLVES A.20. reshape_deq.py line 908 uses
    sorted(sensor_dir.glob("*.csv")), which is non-recursive, so a _superseded/
    subfolder under deq-raw/ is excluded automatically. The 2026-08-10 export set
    has been moved to pipeline/sources/deq-raw/_superseded/ and its manifest
    entries marked with superseded_on, superseded_by, and superseded_reason.
    deq-raw/ now holds exactly six files, all _2026-08-28. Do not modify
    reshape_deq.py. Do not delete anything under _superseded/. In Phase 0,
    confirm the glob resolves to exactly six files before running anything.
