# Reshape delta, 2026-08-28 Kunak refresh

- Baseline data cutoff: 2026-08-10 (git HEAD snapshot)
- Refreshed data cutoff: 2026-08-28
- Sensor rows are hour-ending in the raw export and normalised to
  hour-beginning EST by reshape_deq; timestamps below are ts_est.
- Regulatory monitor is unchanged in this refresh: it remains capped
  at 2026-08-10 by FOIA 26-4646.

## 1. Row counts per site

| site | rows before | rows after | delta | site-hours before | site-hours after | delta |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ashburn-collocated | 11586 | 12885 | +1299 | 3862 | 4295 | +433 |
| belfort-park | 6369 | 7668 | +1299 | 2123 | 2556 | +433 |
| dulles-area | 11589 | 12885 | +1296 | 3863 | 4295 | +432 |
| farmwell-middle | 8988 | 10290 | +1302 | 2996 | 3430 | +434 |
| golf-course | 8988 | 10296 | +1308 | 2996 | 3432 | +436 |
| sterling-ms | 3921 | 5220 | +1299 | 1307 | 1740 | +433 |
| **total** | **51441** | **59244** | **+7803** | | | |

Regulatory monitor rows: 11592 before, 11592 after (unchanged, FOIA cap).

## 2. Excluded rows per site per pollutant

| site | pollutant | rows before | excl before | pct before | rows after | excl after | pct after | reason change |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ashburn-collocated | NO2 | 3862 | 780 | 20.2% | 4295 | 797 | 18.6% | none |
| ashburn-collocated | PM2.5 | 3862 | 167 | 4.3% | 4295 | 168 | 3.9% | none |
| ashburn-collocated | VOCs | 3862 | 194 | 5.0% | 4295 | 266 | 6.2% | none |
| belfort-park | NO2 | 2123 | 603 | 28.4% | 2556 | 645 | 25.2% | none |
| belfort-park | PM2.5 | 2123 | 31 | 1.5% | 2556 | 32 | 1.3% | none |
| belfort-park | VOCs | 2123 | 109 | 5.1% | 2556 | 110 | 4.3% | none |
| dulles-area | NO2 | 3863 | 576 | 14.9% | 4295 | 636 | 14.8% | none |
| dulles-area | PM2.5 | 3863 | 253 | 6.5% | 4295 | 265 | 6.2% | none |
| dulles-area | VOCs | 3863 | 80 | 2.1% | 4295 | 81 | 1.9% | none |
| farmwell-middle | NO2 | 2996 | 554 | 18.5% | 3430 | 562 | 16.4% | none |
| farmwell-middle | PM2.5 | 2996 | 35 | 1.2% | 3430 | 39 | 1.1% | none |
| farmwell-middle | VOCs | 2996 | 968 | 32.3% | 3430 | 1223 | 35.7% | none |
| golf-course | NO2 | 2996 | 576 | 19.2% | 3432 | 610 | 17.8% | none |
| golf-course | PM2.5 | 2996 | 23 | 0.8% | 3432 | 34 | 1.0% | none |
| golf-course | VOCs | 2996 | 55 | 1.8% | 3432 | 71 | 2.1% | none |
| sterling-ms | NO2 | 1307 | 223 | 17.1% | 1740 | 253 | 14.5% | none |
| sterling-ms | PM2.5 | 1307 | 25 | 1.9% | 1740 | 26 | 1.5% | none |
| sterling-ms | VOCs | 1307 | 13 | 1.0% | 1740 | 14 | 0.8% | appeared: exact_zero_floor |

## 3. Exact zeros and max run length

| site | pollutant | zeros before | zeros after | delta | max run before | max run after |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| ashburn-collocated | NO2 | 780 | 797 | +17 | 45 | 45 |
| ashburn-collocated | PM2.5 | 53 | 54 | +1 | 16 | 16 |
| ashburn-collocated | VOCs | 194 | 266 | +72 | 53 | 53 |
| belfort-park | NO2 | 603 | 645 | +42 | 22 | 22 |
| belfort-park | PM2.5 | 31 | 32 | +1 | 11 | 11 |
| belfort-park | VOCs | 109 | 110 | +1 | 21 | 21 |
| dulles-area | NO2 | 576 | 636 | +60 | 36 | 36 |
| dulles-area | PM2.5 | 142 | 154 | +12 | 13 | 13 |
| dulles-area | VOCs | 80 | 81 | +1 | 31 | 31 |
| farmwell-middle | NO2 | 554 | 562 | +8 | 23 | 23 |
| farmwell-middle | PM2.5 | 35 | 39 | +4 | 8 | 8 |
| farmwell-middle | VOCs | 968 | 1223 | +255 | 39 | 39 |
| golf-course | NO2 | 576 | 610 | +34 | 37 | 37 |
| golf-course | PM2.5 | 23 | 34 | +11 | 5 | 7 |
| golf-course | VOCs | 55 | 71 | +16 | 10 | 10 |
| sterling-ms | NO2 | 210 | 240 | +30 | 22 | 22 |
| sterling-ms | PM2.5 | 12 | 13 | +1 | 6 | 6 |
| sterling-ms | VOCs | 0 | 1 | +1 | 0 | 1 |

## 4. Missing hours

| site | before | after |
| --- | --- | --- |
| ashburn-collocated | 2026-03-08 01:00:00 [dst_spring_forward]<br>2026-04-21 06:00:00 [unexplained] | 2026-03-08 01:00:00 [dst_spring_forward] |
| belfort-park | 2026-06-20 04:00:00 [unexplained]<br>2026-06-20 05:00:00 [unexplained] | 2026-06-20 04:00:00 [unexplained] |
| dulles-area | 2026-03-08 01:00:00 [dst_spring_forward] | 2026-03-08 01:00:00 [dst_spring_forward] |
| farmwell-middle | 2026-06-20 04:00:00 [unexplained]<br>2026-07-10 04:00:00 [unexplained]<br>2026-07-20 03:00:00 [unexplained]<br>2026-07-30 03:00:00 [unexplained] | 2026-06-20 04:00:00 [unexplained]<br>2026-07-20 03:00:00 [unexplained] |
| golf-course | 2026-04-27 04:00:00 [unexplained]<br>2026-05-14 00:00:00 [unexplained]<br>2026-06-28 03:00:00 [unexplained]<br>2026-06-28 04:00:00 [unexplained] | none |
| sterling-ms | 2026-06-29 14:00:00 [unexplained]<br>2026-07-09 12:00:00 [unexplained] | 2026-06-29 14:00:00 [unexplained] |

New missing hours introduced by the refresh: 0

Missing hours resolved by the refresh: 9
- ashburn-collocated 2026-04-21 06:00:00
- belfort-park 2026-06-20 05:00:00
- farmwell-middle 2026-07-10 04:00:00
- farmwell-middle 2026-07-30 03:00:00
- golf-course 2026-04-27 04:00:00
- golf-course 2026-05-14 00:00:00
- golf-course 2026-06-28 03:00:00
- golf-course 2026-06-28 04:00:00
- sterling-ms 2026-07-09 12:00:00

## 5. Daily reconciliation (regulatory FEM monitor, site_id ashburn)

This compares GENARCH's recomputed daily averages of the REGULATORY
FEM monitor at Broad Run HS against DEQ's published daily-average
file for that same monitor. It is not a sensor reconciliation.

| metric | before | after |
| --- | ---: | ---: |
| comparable days | 119 | 119 |
| exact after truncation | 118 | 118 |
| mismatches | 1 | 1 |

Mismatches by date:

| date | recomputed | published | status |
| --- | ---: | ---: | --- |
| 2026-03-10 | 5.0 | 5.2 | persists (unchanged) |

Daily rows emitted: 840 before, 948 after.


## 6. Prompt 2.3, the 2026-03-10 mismatch

The single mismatch persists unchanged: recomputed 5.0 against published 5.2.
Both values are identical to the pre-refresh baseline, so the refresh did not
disturb it. This was resolved previously through correspondence with DEQ, which
confirmed that 5.0 is what recomputes from the hourly data. It is left in place
and reported rather than reconciled away.

## 7. Prompt 2.4, Sterling MS growth check

Sterling MS grew from 1307 to 1740 site-hours, which is 3921 to 5220 long rows.
The prompt anticipated roughly 1680 for 2026-06-18 through 2026-08-27, and the
arithmetic accounts for the difference exactly. The window 2026-06-18 00:00 to
2026-08-27 23:00 is 1704 hours; the export also carries 13 pre-occupancy transit
hours on 2026-06-17 and the full 24 hours of 2026-08-28, giving 1741 expected.
One hour is missing at 2026-06-29 14:00, leaving 1740. The site landed where it
should and needs no investigation.

## 8. Export stability, an unprompted finding worth recording

The refresh introduced no new missing hours and resolved nine that the
2026-08-10 export had left absent. Those nine hours fall well inside the earlier
export's own range, so the Kunak dashboard backfilled them at some point between
the two pulls rather than the pipeline changing how it counts them. A re-pull is
therefore not purely additive, and any figure computed from a single export
carries the state of the dashboard on its download date. This is the practical
reason every output in this refresh carries its data cutoff as a field.

Golf Course moved from four missing hours to none, and its PM2.5 exact-zero max
run grew from 5 to 7, which is the same backfill showing up in a second measure.
