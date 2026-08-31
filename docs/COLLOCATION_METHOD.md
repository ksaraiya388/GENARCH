# Collocation reproduction method

Established 2026-08-29 by policy, selection, and leverage sweeps
(`scripts/collocation_policy_sweep.py`, `scripts/collocation_selection_sweep.py`,
`scripts/collocation_leverage_check.py`).

## Method

Sensor site `ashburn-collocated` against regulatory site `ashburn`, both
corresponding to DEQ's published site name **Broad Run HS**.

1. Pair on `ts_est`. Kunak timestamps are hour-ending and DST-adjusted; the
   regulatory files are hour-beginning EST, and `shift_hours` reconciles them.
   Pairing on `ts_raw` degrades every regression substantially and is wrong.
2. Apply the `excluded` flag on both sides. Regulatory exclusions are mandatory
   rather than optional, because unexcluded regulatory rows carry missing values
   behind `aqs_null_code` and produce NaN coefficients.
3. Assign readings to collocation periods **by date**, following DEQ's own
   definition: APEX 14 from 2026-03-03 to 2026-04-08, APEX 5 from 2026-04-08
   onward. Do not assign by `unit_id`. See the attribution defect below.
4. Ordinary least squares, sensor on x and regulatory monitor on y, matching
   DEQ's published scatter plot convention.

## Unit attribution defect

Date-window and `unit_id` selection differ by two paired NO2 rows,
2026-04-07 22:00 and 23:00 in `ts_est`, which the pipeline labels `apex-05`.
With hour-ending Kunak stamps and `shift_hours = 1` these originate at
`ts_raw` 2026-04-07 23:00 and 2026-04-08 00:00, spanning the swap boundary.
DEQ places APEX 14 at Broad Run HS through 2026-04-08, so both rows belong to
the APEX 14 period and the pipeline's `unit_id` contradicts the report.

This is the same class of defect as the open apex-14 unit conflict, where
`ashburn-collocated` and `newberry-condo` both claim the unit for
2026-03-03 to 2026-04-08 and `unit_id_confidence` reads "ambiguous". Treat
`unit_id` as unreliable within a day of any documented sensor swap. Not fixed
here; recorded for a separate scoped task.

## Reproduction status at a 2026-08-10 cutoff, against the 2026-08-28 report

Recomputed 2026-08-29 from the refreshed export. The regulatory monitor ends
2026-08-10 under FOIA 26-4646, so the paired data cannot reach the 2026-08-27
cutoff the 2026-08-28 report was produced from. Both APEX 5 rows are therefore
capped and are not comparable to that report. Full output with every cutoff
recorded as a column is in `outputs/repro/collocation_2026-08-28.csv`.

| Regression | Window | n | GENARCH | DEQ published 2026-08-28 | Rounds to DEQ |
|---|---|---|---|---|---|
| PM2.5 APEX 14 | closed | 699 | 1.2933 + 0.8317x, R2 0.7255 | 1.3 + 0.83x, R2 0.73 | yes, all three |
| NO2 APEX 14 | closed | 591 | 2.1957 + 1.0652x, R2 0.4908 | 2.2 + 1.1x, R2 0.49 | yes, but see the R2 caveat |
| PM2.5 APEX 5 | open, capped | 2183 | -4.7002 + 1.6565x, R2 0.8345 | -5 + 1.6x, R2 0.82 | not comparable |
| NO2 APEX 5 | open, capped | 2313 | 1.6614 + 0.3397x, R2 0.1990 | 1.7 + 0.31x, R2 0.21 | not comparable |

APEX 14 is a closed window, 2026-03-03 to 2026-04-08, and its published values
are fixed: DEQ printed the same two regressions in all four editions from
2026-08-07 to 2026-08-28. APEX 5 remains collocated and refits every week, and
its published coefficients moved in every edition. Comparing an APEX 5 figure
across editions without aligning cutoffs compares two windows, not two
calculations.

The window-mismatch hypothesis for the historical APEX 5 near-miss is refuted.
A cutoff sweep from 2026-08-05 to 2026-08-10 moves the APEX 5 NO2 intercept by
0.011, the slope by 0.002 and the R2 by 0.002 on roughly 2,300 pairs
(`scripts/collocation_window_sweep.py`). The near-miss is not explained by
comparing a GENARCH figure computed a few days later than DEQ's.

## Robustness of the APEX 14 NO2 R2

The R2 match should not be presented as a reproduction. Leave-one-out
resampling on the n=591 fit gives R2 from 0.4784 to 0.5031, a spread of 0.0248
around a full-sample 0.4908. Removing any of several single observations pushes
the value above 0.4950, where it rounds to 0.50 rather than DEQ's published
0.49. The intercept and slope are stable and do reproduce; the R2 sits close
enough to a rounding boundary that a small methodological difference would flip
it.

The highest-leverage observations cluster on 2026-03-28 and 2026-03-29, all
with positive residuals, reflecting a sustained period in which the regulatory
monitor read above the sensor. That episode carries a large share of the fit.

## Zero treatment

Exact-zero sensor readings are excluded as a fault mode (`exact_zero_floor`)
everywhere in the pipeline and everywhere on the site, with one documented
exception: the APEX 5 NO2 collocation regression readmits them because DEQ
confirmed on 2026-08-19 that DEQ retains them there. The reproduction table
above uses the pipeline default throughout, so its APEX 5 NO2 row is the
zeros-excluded fit and is not the same calculation as DEQ's.

Supporting evidence: the APEX 14 NO2 collocation is a closed window whose
DEQ-published value cannot drift, which makes it the cleanest available test.
Excluding zeros gives R2 = 0.4908; retaining them gives 0.5442. The 0.053 gap
is roughly twice the 0.025 leave-one-out spread, so the direction is
informative even though neither value is a precise match to DEQ's published
figure at this precision. NO2 discriminates because `ashburn-collocated`
carries 780 exact-zero NO2 readings against 53 for PM2.5.

State this as directional support for the exclusion decision, not as proof that
DEQ applies the same rule.

Limitation: the evidence covers NO2 only. PM2.5 carries too few exact zeros
(3 to 12 paired rows across the two collocation windows) for the data to
distinguish the policies, so PM2.5 zero treatment remains an unvalidated choice
carried over for consistency.

## Precision

DEQ publishes coefficients at two significant figures. Any reproduction claim
is a claim that GENARCH values round to DEQ's at DEQ's published precision.
Agreement to three decimals is not verifiable against the source and must not
be claimed.

## The stored APEX 5 NO2 figure is sourced, not stray

A stored APEX 5 NO2 figure of 1.84 / 0.316 / 0.205 reproduces only under a
zeros-retained policy, which on its face makes it inconsistent with the other
three stored figures. It was provisionally treated as an unsourced value to be
replaced. That was wrong, and the record corrects it.

DEQ confirmed on 2026-08-19 that exact-zero measurements are retained in that
one regression, supplied the corrected coefficients, and attached the paired
hourly data the fit runs on. The treatment is therefore a deliberate,
agency-confirmed exception scoped to a single comparison, recorded in
`docs/GENARCH_RULES.md` section 9 and implemented as a per-comparison flag in
`getCollocation()`. It is not a policy inconsistency and the figure is not
superseded on those grounds.

The scoping matters and is not incidental. Readmitting exact zeros into the
other three regressions moves coefficients that currently reproduce back out of
tolerance: APEX 14 PM2.5 intercept to 1.368 against a published 1.3, and
APEX 14 NO2 R2 to 0.5442 against a published 0.49. DEQ's confirmation covers
the regression DEQ was asked about, and extending it further contradicts the
arithmetic.

What is genuinely superseded is the comparator, not the treatment. DEQ has since
printed APEX 5 NO2 at 1.8 + 0.31x, R2 0.2 in the 2026-08-21 edition and
1.7 + 0.31x, R2 0.21 in the 2026-08-28 edition, each over its own longer window.
Cite the edition and its window, and do not set any of them beside a fit
computed to a different cutoff.
