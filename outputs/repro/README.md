# Reproduction outputs, DEQ Data Center Air Monitoring Project

These files reproduce Virginia DEQ's published analysis from the raw sensor and
regulatory records. They are internal reproduction artifacts, not public pages.

Every file carries both its **data cutoff** and its **export date** as columns.
The two are separate facts. The Kunak dashboard revises previously-published
hours without notice, so two exports covering an identical range can disagree
and a figure is a function of when it was pulled as well as of where the data
stops. See `docs/DATA_PROVENANCE.md`.

## What this data can and cannot support

This work describes co-location and measurement mechanism. It does not establish
that any source caused any exposure, and nothing here supports a causal claim.
The findings describe the locations where DEQ has placed sensors, not the
corridor as a whole and not any individual facility or company. All statistics
are population-level and none of them speak to any individual's risk, diagnosis,
or health.

Most readings in this record sit well below the National Ambient Air Quality
Standards. The mean daily PM2.5 across the six operating sensors runs between
5.9 and 10.5 µg/m³.

## DEQ's limitation language, quoted verbatim

Virginia DEQ, Office of Air Quality Monitoring, "Data Center Air Quality
Analysis", August 28, 2026, page 4:

> These sensors are capable of collecting pollutant concentration data and
> establishing pollutant concentration trends, but they are not regulatory
> instruments as specified in the Code of Federal Regulations (CFR). They cannot
> be used in determining attainment or non-attainment of the National Ambient
> Air Quality Standards (NAAQS). Only Federal Reference/Equivalent Method
> designated monitors can.

## The form of the standard

A single hourly reading above 35 µg/m³ is not measured against the 24-hour PM2.5
standard and does not by itself show that the standard has been surpassed. The
regulatory form of that standard is the 98th percentile of daily 24-hour
averages, averaged over three consecutive years. The separate annual standard is
9.0 µg/m³, as revised in 2024. Neither form can be evaluated against a low-cost
sensor record, and neither is evaluated here.

## Files

| File | What it holds | Cutoff | Export |
|---|---|---|---|
| `collocation_2026-08-28.csv` | Four regressions at the collocated site, with DEQ's published values and whether each rounds to DEQ's precision | sensors 2026-08-28, regulatory 2026-08-10 | 2026-08-28 / FOIA |
| `daily_reconciliation_2026-08-28.csv` | Per-day recomputed against DEQ's published daily averages, regulatory monitor only | 2026-08-09 | FOIA 26-4646 |
| `p98_common_window_2026-08-28.csv` | Daily PM2.5 98th percentiles on the common window and the full record | 2026-08-28 | 2026-08-28 |
| `zero_treatment_sensitivity_2026-08-28.csv` | Site means and p98 under both exact-zero policies | 2026-08-28 | 2026-08-28 |
| `table4_full_comparison_2026-08-28.csv` | DEQ Table 4, all four statistics per site, under both day-binning conventions, with the p98 rank and bracketing days | 2026-08-27 | 2026-08-28 |
| `p98_rank_position_2026-08-28.csv` | Which order statistic the 98th percentile is read from at each record length, with the bracketing values and the interpolation-method spread | 2026-08-27 | 2026-08-28 |
| `p98_day_binning_residual_2026-08-28.csv` | Every day whose validity or value differs between the two day-binnings | 2026-08-27 | 2026-08-28 |
| `table2_no2_hourly_2026-08-28.csv` | DEQ Table 2 reproduction, NO2 hourly, under both exact-zero policies | sensors 2026-08-27, regulatory 2026-08-10 | 2026-08-28 / FOIA |
| `table3_pm25_hourly_2026-08-28.csv` | DEQ Table 3 reproduction, PM2.5 hourly, under both exact-zero policies | sensors 2026-08-27, regulatory 2026-08-10 | 2026-08-28 / FOIA |
| `diagnostics/p98_diagnostics_2026-08-30.txt` | Raw output of the three p98 solver scripts | 2026-08-27 | 2026-08-28 |
| `reshape_delta_2026-08-28.md` | Before and after the refresh, every count that changed | 2026-08-10 to 2026-08-28 | both |
| `superseded_claims_audit_2026-08-28.csv` | Claims affected by the new report, with the disposition of each | text audit, no cutoff | not applicable |
| `refresh_report_2026-08-28.md` | The full account of the 2026-08-29 refresh, with corrections issued 2026-08-30 | 2026-08-28 | 2026-08-28 |
| `consolidation_2026-08-29.md` | The full account of the consolidation task | 2026-08-27 | 2026-08-28 |
| `pre_refresh_2026-08-28/` | Baseline snapshot from git HEAD, for the delta | 2026-08-10 | 2026-08-10 |

`superseded_claims_audit_2026-08-28.csv` is an audit of repository text rather
than a table of measurements, so no cutoff or export date applies to it. Every
other file carries both.

Site names follow DEQ's published labels so a reader can find each site in the
report. The public pages deliberately do not: four of the sites are hosted at
schools, and `docs/CONTENT_CONSTRAINTS.md` section 4 forbids placing a school
name beside a reading value there.
