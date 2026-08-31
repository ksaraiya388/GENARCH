# TASK: Consolidate the 2026-08-28 refresh findings and reframe the record-length claim

## Context

The Kunak refresh (2026-08-28 export, data through 2026-08-28 23:00) is
complete and staged. That task produced four results that change what the
project claims, and left four items open. This task resolves them.

Read `outputs/repro/refresh_report_2026-08-28.md` before starting. Its findings
supersede any conflicting statement in this brief.

Standing constraints in CONTENT_CONSTRAINTS.md apply throughout and are
enforced by the lint. Where this brief and the lint disagree, the lint wins and
you report the conflict rather than working around it.

## PHASE 0 — Gates

0.1 `git status` clean apart from the staged refresh. If not, stop.
0.2 `sorted(Path("pipeline/sources/deq-raw").glob("*.csv"))` resolves to exactly
    six files, all `_2026-08-28`. If not, stop.
0.3 Read `scripts/p98_offset_diagnostic.py` output. If it has not been run, run
    it and record the result before proceeding.

## PHASE 1 — Finish the p98 offset diagnosis

The refresh established: site means reproduce DEQ Table 4 to within 0.055; the
divergence is confined to p98, up to +2.10; zero treatment moves p98 by at most
0.14; percentile method was ruled out. Cause open.

1.1 Compare all four published statistics per site against DEQ Table 4 (daily)
    and Table 3 (hourly): mean, standard deviation, median, 98th percentile.
    Truncate to 2026-08-27 to match the report period. Emit
    `outputs/repro/table3_table4_full_comparison.csv` with a delta column per
    statistic.

1.2 Interpret. A high sd alongside a high p98 indicates extra or higher extreme
    days on the GENARCH side, which localises the cause to day inclusion. An sd
    that matches while p98 alone diverges indicates rank interpolation and means
    the underlying daily values agree. Report which pattern holds. Do not report
    both as equally likely if the data distinguishes them.

1.3 If the pattern points at day inclusion, list every day in the top ten daily
    values per site with its valid-hour count, and flag any day sitting at the
    18-of-24 completeness boundary. DEQ voided 2026-03-03 to 2026-03-08 for
    sensor PM2.5 and 2026-05-07 to 2026-05-10 at the Broad Run HS regulatory
    monitor; check whether GENARCH honours both windows identically to DEQ.
    Emit `outputs/repro/p98_day_inclusion_2026-08-28.csv`.

1.4 If the cause remains unresolved after 1.3, say so plainly and record what
    was ruled out. Do not attribute it. An open question stated precisely is
    worth more than a plausible attribution.

## PHASE 2 — Reframe the record-length claim as an order statistic

This replaces the Sterling MS ranking argument everywhere it appears.

2.1 The argument is now: the 98th percentile of daily averages is a different
    order statistic at different record lengths. On a 72-day record it falls at
    rank 70.6 of 72, effectively the second-highest daily value. On a 179-day
    record it falls near rank 175, roughly the fourth-highest, drawn from a
    denser part of the distribution. Comparing the two as though they were the
    same quantity compares a near-maximum against a genuine upper-tail quantile.

2.2 Compute and publish, per site, the exact rank the 98th percentile falls at,
    the identity of the bracketing daily values, and the gap between them.
    Emit `outputs/repro/p98_rank_position_2026-08-28.csv`.

2.3 The interpolation sensitivity is the evidence: method choice alone moves
    Sterling MS's p98 by 13.27 against 0.35 to 2.33 for the longer records.
    Present it as the measurement of the effect, not as an aside.

2.4 The Sterling MS series (40.4, 38.2, 36.0, 33.8 across the four archived
    reports) becomes supporting illustration, not the claim. State that DEQ's
    2026-08-28 Table 4 shows no site above 35.0 and that the earlier ranking
    resolved as the record grew. Do not present this as correcting a standing
    DEQ error; it is a methodological point about the statistic.

2.5 Rewrite every artifact carrying the old framing: the /community/data-center-alley
    page, any chart caption, `docs/`, and `outputs/repro/` summaries. Audit
    first, list what you will change, then change it.

## PHASE 3 — Export date as provenance

The refresh resolved nine previously-missing hours inside the prior export's own
date range. The Kunak dashboard backfills, so two exports covering identical
ranges can disagree and a figure is a function of export date as well as data
cutoff.

3.1 Add `export_date` alongside the existing cutoff column to every file in
    `outputs/repro/`. Backfill it on existing files where the export is known.

3.2 Register all twelve raw Kunak exports in `pipeline/sources/manifest.json`
    if the refresh task did not already, six active and six under
    `_superseded/`. Each entry carries export_date, requested range, actual
    first and last data timestamp, sha256, and size. Mark the superseded six
    with superseded_on, superseded_by, and reason.

3.3 Document the backfill behaviour in `docs/` as a property of the source:
    the dashboard revises previously-published hours without notice, re-pulls
    are not purely additive, and `_superseded/` is therefore load-bearing rather
    than housekeeping. Include the nine specific hours and their before and
    after state.

3.4 Draft nothing for DEQ. Record the observation only; correspondence is a
    separate decision.

## PHASE 4 — Demote the deq-data.ts assertion

`deq-data.ts` `apex-05-no2` asserts against DEQ's 2026-08-19 corrected value
while the fit beside it stops at the 2026-08-07 cutoff. The FOIA 26-4646
regulatory record ends 2026-08-10, so the windows cannot be aligned in either
direction and the comparison cannot be made valid by any change on this side.

4.1 Remove `apex-05-no2` from the build-time assertion set. A gate that passes
    on a comparison known to be non-comparable is worse than no gate.

4.2 Keep both values as a recorded pair with an explicit non-comparability
    label naming the two cutoffs and the reason.

4.3 Leave a marker tied to the FOIA follow-up so the gate is restored when the
    extended regulatory record arrives. Do not delete the divergence.

4.4 Confirm the build still exits 0 and that no other assertion depended on it.

## PHASE 5 — Reproduce DEQ Tables 2 and 3

Both are hourly statistical summaries. Their sensor rows need no regulatory
monitor and are therefore not capped by the FOIA.

5.1 Table 2, NO2 hourly, per site: mean, sd, median, 98th percentile, in ppb.
5.2 Table 3, PM2.5 hourly, per site: same four statistics, in ug/m3.
5.3 Truncate to 2026-08-27. Emit `outputs/repro/table2_no2_hourly_2026-08-28.csv`
    and `outputs/repro/table3_pm25_hourly_2026-08-28.csv`, each with a delta
    column against DEQ's published value and a stated cutoff and export date.
5.4 The regulatory-monitor rows in both tables are capped at 2026-08-10. Compute
    them, label them not comparable, and do not count them as reproductions.
5.5 The three retired sites have no export and cannot be checked. State this in
    each output.

## PHASE 6 — CO ingestion decision (gated, defer if uncertain)

The 2026-08-28 export carries a CO (ppm) column that the prior export did not.
It does not match `KUNAK_POLLUTANT_PREFIXES`, so the pipeline discards it. DEQ
Table 1 publishes sensor CO for every site, so ingesting it unlocks a fourth
reproducible table. The regulatory CO comparator (Aurora Hills, Arlington) is
already ingested.

6.1 This requires modifying `reshape_deq.py`, which prior briefs prohibited.
    Proceed only if all of the following hold, and report which fail:
      - Adding CO leaves every existing output byte-identical apart from new
        CO rows. Verify by diff, not by inspection.
      - CO passes the same validity, exact-zero, and occupancy rules as the
        other pollutants with no special-casing.
      - `pipeline.validate` and the full gate set still exit 0.
6.2 If all hold, ingest CO and reproduce Table 1 as in Phase 5.
6.3 If any fails, stop, revert, and report. Do not partially ingest.
6.4 Ignore the AQI column in either case. It is a derived index rather than a
    measurement and DEQ publishes no AQI table in this report.

## PHASE 7 — Prompt provenance

7.1 Keep `.claude/prompts/` tracked in git.
7.2 Add a corrections header to `kunak_refresh_2026-08-28.md` recording that
    four amendment premises were refuted during execution, with what replaced
    each:
      A.5  DEQ's published site names cannot be used publicly. They are school
           names and CONTENT_CONSTRAINTS.md section 4 forbids a school name near
           a reading value. Satisfied in outputs/repro artifacts instead.
      A.7  False. Three prior report editions are archived at docs/deq-reports/.
           All twelve Sterling MS figures and all four editions' collocation
           coefficients were extracted and reproduce exactly.
      A.9/A.12 Wrong. The zeros-retained treatment on APEX 5 NO2 is DEQ
           correspondence dated 2026-08-19, deliberately scoped to that one
           regression. The scoping is load-bearing; extending it breaks the two
           regressions that currently reproduce.
      A.15 Mechanism wrong. shift_hours is 2, not 1, so the two boundary hours
           fall on 2026-04-08 in raw local time and the pipeline's apex-05 label
           agrees with DEQ. No boundary defect exists.
7.3 State in the header that the corrections were made during execution against
    the brief. A record containing corrected errors is stronger evidence of
    method than a clean one.

## PHASE 8 — Constraint enforcement

Check each explicitly and report the check, not only the fix.

8.1 No causal claims; co-location and mechanism only, in the first paragraph of
    every artifact.
8.2 No specific facility named as harming specific people.
8.3 Sensor limitations and the fact that most readings sit below NAAQS stated
    prominently and first.
8.4 No policy position on data centers.
8.5 Population-level only.
8.6 Ecological-fallacy disclosure wherever tract-level exposure and tract-level
    prevalence appear together.
8.7 DEQ's sensor limitation language verbatim and attributed in every
    limitations box, chart caption, and artifact touching this data, paired with
    the note that a single hourly reading above 35 ug/m3 is not an exceedance of
    the 24-hour standard and that the separate annual standard is 9.0 ug/m3.
8.8 Constraint lint against the ratchet baseline. Current baseline: 52
    violations, 52 baselined, 0 new, 0 structural. Must not regress.
8.9 All prose passes humanizer-skill standards.

## PHASE 9 — Gates

reshape_deq, validate, `python -m ruff check pipeline/`, `npx tsc --noEmit`,
`npm run build`. All exit 0. Report the citation gap counts (currently 628 rows,
160 edges) without fixing them.

## PHASE 10 — Report

Write `outputs/repro/consolidation_2026-08-29.md`: the Phase 1 diagnosis and
which pattern the data supports, the Phase 2 rank figures, every file edited,
the Phase 4 decision and its build effect, Phase 5 and 6 reproduction results
with deltas, the Phase 8 constraint results, the Phase 9 gates, and an explicit
list of anything that could not be resolved and why.

Stage everything. Do not commit. Do not push.

## PROHIBITIONS

- Do not extend the zeros-retained treatment beyond APEX 5 NO2. It is scoped by
  DEQ correspondence and extending it breaks reproducing regressions.
- Do not modify reshape_deq.py outside Phase 6, and not there unless every 6.1
  condition holds.
- Do not use DEQ's published site names in public-facing artifacts.
- Do not restate any figure without its cutoff and export date.
- Do not attribute the p98 offset to a cause the data does not support.
- Do not fix the citation manifest, the canvas backing-store issue, or the node
  summary mojibake.
- Do not write outreach material, email, or press copy.
- Do not commit or push.

## ACCEPTANCE

The p98 offset is either localised to a specific mechanism or reported open with
what was ruled out; the record-length claim reads as an order-statistic argument
everywhere it appears; every output carries cutoff and export date; all twelve
raw exports are in the manifest; the deq-data.ts gate is demoted with the
divergence preserved; Tables 2 and 3 are reproduced with deltas; the CO decision
is made and justified either way; the corrections header exists; the lint has not
regressed; all Phase 9 gates exit 0; nothing is committed.

## PHASE 1 REPLACEMENT (supersedes 1.1 through 1.4)

The diagnostic has already run. Its result:

  Mean, standard deviation, and median reproduce DEQ Table 4 on all six sites.
  sd deltas are -0.06 to -0.11 uniformly, consistent with rounding. Only the
  98th percentile diverges, and it diverges in BOTH directions: +2.07 Dulles,
  +2.06 Farmwell, +1.16 Golf Club, +0.48 Belfort, +0.37 Broad Run,
  -0.92 Sterling MS.

Consequences, which override earlier statements in this brief and in the
refresh report:

1.1 Day inclusion is ELIMINATED. Extra or higher extreme days would inflate sd
    alongside p98; sd matches. The underlying daily values agree with DEQ's. Do
    not run the 18-of-24 boundary investigation.

1.2 The refresh report's statement that percentile method was ruled out cannot
    stand. Mean, sd, and median all reproduce, so the difference has nowhere
    else to live. Correct that statement in the refresh report and note why.

1.3 Any project text describing the offset as "1 to 2 ug/m3 above DEQ
    consistently" is FALSE and must be corrected wherever it appears. The
    divergence is bidirectional, 0.37 to 2.07 in magnitude. Add this to the
    Phase 2.5 audit.

1.4 Mechanism. At every site the 98th percentile falls inside a large gap
    between the bulk of the distribution and the wildfire days: Dulles
    21.1 to 28.5, Farmwell 27.6 to 44.1, Golf Club 25.2 to 40.1, Sterling
    24.9 to 38.2, Belfort 26.4 to 39.0, Broad Run 26.0 to 37.0. A one-day
    difference in n or a different quantile convention slides the
    interpolation point across an 11 to 16 ug/m3 void, in either direction.
    This is the same instability as the record-length finding, generalised:
    the p98 of daily PM2.5 at these sample sizes is method-sensitive at every
    site, not only at the short-record one. Fold this into Phase 2 as the
    general form of the argument.

1.5 Read scripts/p98_method_solver.py and its output. It tests quantile
    conventions (numpy linear, lower, higher, nearest, midpoint; R types 4 and
    6; EPA 40 CFR Part 50 Appendix N rank selection) across three cutoffs
    against DEQ's six published values. If one convention reproduces all six,
    adopt it for every published-table comparison, document it in
    docs/COLLOCATION_METHOD.md or a new docs/PERCENTILE_METHOD.md, and close
    the open question. If none does, the remaining difference is DEQ's day set
    rather than the convention; report the per-site day-count difference
    implied and leave it open. Do not change the pipeline default.

1.6 Emit outputs/repro/table4_full_comparison_2026-08-28.csv with all four
    statistics per site, deltas, n, the bracketing daily values around the p98
    rank, and the gap width. Carry cutoff and export date as columns.

## PHASE 1 RESOLVED (supersedes 1.5b through 1.5d)

The day-grouping solver has run and the p98 divergence is explained.

Grouping hours into days by (ts_raw - 1 hour).date reproduces DEQ Table 4:
golf-course +0.04, ashburn-collocated +0.05, dulles-area +0.02,
belfort-park +0.06, farmwell-middle +0.41, sterling-ms +0.35, against
+0.42 to +2.12 under the current date_est binning. Every grouping holds the
mean within 0.07, so the mean does not discriminate; the p98 does.

Mechanism: ts_raw is Kunak dashboard local clock time, hour-ending. Minus one
hour gives hour-beginning local. ts_est subtracts shift_hours, which is 1 in EST
and 2 in EDT, giving hour-beginning EST. The two binnings are identical in
winter and differ by one hour during EDT, which moves the last hour of each
local day into the previous day.

GENARCH bins daily averages by local standard time; DEQ's published sensor
table bins by local clock time. GENARCH's convention matches 40 CFR Part 50
Appendix N, which specifies local standard time for daily averages.

1.6a Do NOT change the pipeline's date_est binning. It is the regulatory
     convention and it is correct. The finding is that the two conventions
     diverge, not that either is wrong.

1.6b Document this in docs/PERCENTILE_METHOD.md: both conventions, the
     mechanism, the per-site effect on all four statistics, and the fact that
     the divergence appears only in EDT months. State that GENARCH's daily
     values will not match DEQ's published sensor tables during EDT by design,
     and give the magnitude.

1.6c Add a second set of columns to the Table 4 comparison computed under DEQ's
     local-clock binning, so the artifact shows both and a reader can check
     either. Label which is regulatory-convention.

1.6d Investigate the residual on farmwell-middle (+0.41) and sterling-ms
     (+0.35), which remain after regrouping while four sites fall within 0.06.
     Compare per-day valid-hour counts against the 18-of-24 threshold under the
     local-clock binning for both sites and report any day that crosses the
     threshold under one binning and not the other. If unresolved, report open
     with the magnitude; it is under half a microgram and does not affect any
     published claim.

1.6e CORRECT these superseded statements wherever they appear in the repo:
     - "1 to 2 ug/m3 above DEQ consistently" is false. The divergence is
       bidirectional and now explained.
     - The refresh report's claim that percentile method was ruled out stands,
       but the cause was never percentile method; it was day binning. Correct
       the framing.
     - Any text describing the offset as unresolved or open must be updated.

1.6f This is the strongest form of the record-length argument and belongs in
     Phase 2 as the primary claim. At every site the 98th percentile of daily
     PM2.5 falls inside a large gap between the bulk of the distribution and the
     wildfire days (Dulles 21.1 to 28.5, Farmwell 27.6 to 44.1, Golf Club 25.2
     to 40.1, Sterling 24.9 to 38.2, Belfort 26.4 to 39.0, Broad Run 26.0 to
     37.0). A one-hour shift in the day boundary moves the statistic by up to
     2.12 ug/m3 while leaving the mean unchanged to within 0.05. The statistic
     is unstable to defensible methodological choices at these sample sizes,
     at every site, not only the short-record one.

1.6g This is a reportable observation for DEQ correspondence. Record it; do not
     draft the correspondence.
