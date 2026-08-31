# Percentile and day-binning method

How GENARCH computes the daily and hourly statistics it compares against DEQ's
published tables, and where the two conventions diverge.

This document describes measurement convention only. It makes no causal claim,
names no facility, and contains no individual-level statement. Every statistic
here is a site or network aggregate and none speaks to any individual. Most
readings in this record sit well below the standards: site mean daily PM2.5 runs
5.8 to 10.5 µg/m³ over the record to 2026-08-27.

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
24-hour averages, averaged over three consecutive years, and the separate annual
standard is 9.0 µg/m³ as revised in 2024. Neither form can be evaluated against a
low-cost sensor record, and neither is evaluated here. The 98th percentiles
discussed below are the statistic DEQ publishes for these sensors, not a
compliance determination.

All figures below carry a data cutoff of 2026-08-27 and a Kunak export date of
2026-08-28 unless stated otherwise.

## The two day-binning conventions

A daily average needs a rule for which hours belong to which day. Two defensible
rules exist here and they do not agree.

| Convention | Rule | Where it is used |
|---|---|---|
| **Local standard time** | `ts_est`, hour-beginning EST | GENARCH pipeline default; 40 CFR Part 50 Appendix N |
| **Local clock time** | `ts_raw` minus one hour, hour-beginning local | DEQ's published sensor tables |

`ts_raw` is the Kunak dashboard's local clock time, hour-ending. Subtracting one
hour gives hour-beginning local clock. `ts_est` subtracts `shift_hours`, which is
1 in EST and 2 in EDT, giving hour-beginning local standard time.

The two are identical through the winter. During EDT they differ by one hour,
which moves the last hour of each local day into the previous day.

**GENARCH does not change its binning.** Local standard time is the regulatory
convention for daily averages and the pipeline default stays as it is. The
finding is that the two conventions diverge, not that either is wrong.

## Effect on the four published statistics

DEQ's 2026-08-28 Table 4, PM2.5 24-hour averages, against GENARCH under both
binnings. Full figures in `outputs/repro/table4_full_comparison_2026-08-28.csv`.

| Site | n | Δ mean | Δ sd | Δ median | Δ p98, standard time | Δ p98, clock time |
|---|---:|---:|---:|---:|---:|---:|
| 1757 Golf Club | 141 | +0.00 | +0.02 | +0.10 | **+1.19** | +0.04 |
| Belfort Park Dr | 104 | +0.04 | +0.07 | +0.10 | **+0.49** | +0.06 |
| Broad Run HS | 172 | +0.02 | −0.03 | −0.05 | **+0.42** | +0.05 |
| Dulles Airport | 169 | +0.01 | +0.03 | +0.00 | **+2.12** | +0.02 |
| Farmwell Station MS | 140 | +0.02 | +0.04 | −0.05 | **+2.12** | +0.41 |
| Sterling MS | 71 | +0.07 | +0.06 | +0.20 | **−0.89** | +0.35 |

Mean, standard deviation and median reproduce under either binning. Only the
98th percentile discriminates, and under the clock binning it falls to within
0.06 at four of six sites.

The divergence is **bidirectional**, from −0.89 to +2.12. Any description of it
as a consistent offset in one direction is wrong.

### Why only the p98 moves

Moving the day boundary by one hour redistributes hours between adjacent days.
It barely touches the mean, because almost the same hours are averaged either
way. It moves the p98 because at every site the 98th percentile falls inside a
wide gap between the bulk of the distribution and the July smoke days, and the
two days that bracket it are themselves smoke days whose values shift when the
boundary moves.

Bracketing daily values under the standard-time binning:

| Site | Lower | Upper | Gap |
|---|---:|---:|---:|
| Dulles Airport | 18.4 | 20.8 | 2.3 |
| Farmwell Station MS | 26.5 | 27.7 | 1.2 |
| 1757 Golf Club | 24.4 | 25.2 | 0.8 |
| Sterling MS | 24.9 | 38.2 | **13.3** |
| Belfort Park Dr | 26.1 | 26.4 | 0.3 |
| Broad Run HS | 24.3 | 25.9 | 1.6 |

## The residual at two sites

Four sites fall within 0.06 under the clock binning. Two do not: Farmwell
Station MS at +0.41 and Sterling MS at +0.35.

This is not day inclusion. Across the whole network exactly one day changes its
18-of-24 completeness status between the two binnings (Dulles Airport,
2026-07-10, 18 valid hours under standard time and 17 under clock time), and
that day is at neither of the two sites in question. Both sites keep the same
`n` under either binning: 140 and 71.

The residual is the interpolation position inside a wide bracket:

| Site | Binning | Bracketing days and values | Gap | Residual |
|---|---|---|---:|---:|
| Farmwell Station MS | clock | 2026-07-20 at 24.35 → 2026-07-19 at 27.33 | 2.98 | +0.41 |
| Sterling MS | clock | 2026-07-19 at 24.70 → 2026-07-18 at 40.44 | 15.74 | +0.35 |

At Sterling MS the residual is 2 percent of the bracket width. Both residuals sit
under half a microgram and neither affects any published claim. The mechanism is
identified; the exact remaining difference is not closed, and is recorded here as
open. Per-day figures are in
`outputs/repro/p98_day_binning_residual_2026-08-28.csv`.

## Quantile convention

Before the binning was identified, seven quantile conventions were tested against
DEQ's six published values across three cutoffs: numpy `linear`, `lower`,
`higher`, `nearest` and `midpoint`; R types 4 and 6; and EPA 40 CFR Part 50
Appendix N rank selection. No convention reproduced all six sites, and none was
adopted. GENARCH uses numpy `linear` throughout.

The cause was never the quantile convention. It was the day binning. Earlier
project text that recorded the percentile method as "ruled out" was right about
the method and wrong to leave the cause open; the framing is corrected here.

## Exact zeros, and why the treatment is pollutant-specific

The pipeline drops exact-zero readings as an instrument-floor artifact
(`exclusion_reason = exact_zero_floor`). Reproducing DEQ's two hourly tables
shows DEQ does not apply one rule across pollutants.

| DEQ table | Reproduces under | Δ mean, zeros excluded | Δ mean, zeros retained |
|---|---|---|---|
| Table 2, NO2 hourly | zeros **retained** | +0.76 to +0.95 | −0.07 to +0.05 |
| Table 3, PM2.5 hourly | zeros **excluded** | −0.01 to +0.05 | −0.18 to −0.03 |

This corroborates and extends DEQ's correspondence of 2026-08-19, which
confirmed that DEQ retains exact zeros in the APEX 5 NO2 regression. The
behaviour is visible across all six sites in NO2 and absent in PM2.5.

**The pipeline default is unchanged.** The zeros-retained treatment remains
scoped to the single APEX 5 NO2 regression, as DEQ's correspondence scopes it.
Readmitting zeros into the other three regressions breaks two that currently
reproduce. The zeros-retained figures in
`outputs/repro/table2_no2_hourly_2026-08-28.csv` and
`table3_pm25_hourly_2026-08-28.csv` are a diagnostic column set, not a policy
change.

## What this means for comparisons

GENARCH's daily values will not match DEQ's published sensor tables during EDT
months, by design. The magnitude on the 98th percentile is up to 2.12 µg/m³. On
the mean, standard deviation and median it is under 0.1 and the two agree.

Every artifact comparing GENARCH against a DEQ published table carries both
column sets, labelled, so a reader can check either. `reg_*` is the
regulatory-convention set.

## Related

- `docs/COLLOCATION_METHOD.md` — regression method and zero-treatment scope
- `docs/GENARCH_RULES.md` section 4 — timestamp normalization and zero handling
- `outputs/repro/README.md` — DEQ limitation language and the regulatory form of
  the PM2.5 standards
