# GENARCH Annual Report 2026 v1.0: standing context
Read this file before any report, brief, or site work on this branch. Every rule is blocking.

## 1. Encoding
- All files UTF-8 without BOM. Python: open(p, "w", encoding="utf-8", newline="\n"). PowerShell: [System.IO.File]::WriteAllText(p, t, (New-Object System.Text.UTF8Encoding($false))). Never Set-Content -Encoding utf8 or Out-File.
- Interpreter: C:\Python314\python.exe with PYTHONUTF8=1.
- After every edit session run: python scripts/check_mojibake.py (fails on "\u00c3", "\u00c2", "\u00e2\u20ac", a leading "\ufeff", and four box-drawing signatures: R-a "\u251c" followed by a non-whitespace, non-box-drawing character; R-b any block element (U+2580–U+259F); R-c any box-drawing character other than "\u2500" and "\u2502" adjacent to an ASCII letter or digit; R-d "\u252c" followed by anything other than "\u2500" or whitespace. "\u2500" and "\u2502" are out of R-c because legitimate drawings place them against text, so box-drawing trees and tables pass). The patterns are written as escapes here, and in the checker, so neither file matches itself. Files under pipeline/sources/** are skipped and reported as INFO. A line that intentionally documents the corruption itself may carry the marker mojibake-doc; the checker skips that line, and corrupted content is repaired rather than marked.

## 2. Content constraints
C1 No causal claims. Describe co-location and mechanism only, and say so in the first paragraph of every artifact.
C2 Never name a facility or company as harming anyone. Describe the corridor, not the company.
C3 Low-cost-sensor limitations, and the fact that most daily averages are below 35 µg/m³, appear prominently and first.
C4 No policy position on data centers.
C5 Population-level only. No individual risk, no diagnosis, no clinical language (diagnosis, treatment, medication, "you should get tested").
C6 Ecological-fallacy disclosure wherever tract-level exposure and tract-level prevalence appear together.
C7 Internal slugs (ashburn, ashburn-collocated, any site_id) never appear in public output: PDF text, figure labels, alt text, CSV headers, filenames.
C8 CONTENT_CONSTRAINTS.md §4: DEQ school-name sites never appear near reading values. Value tables and figures use neutral site codes. A separate site key without values maps codes to DEQ published names. When the report describes DEQ's Table 4 statement, it refers to the sensor by site code ("DEQ's Table 4 identifies one sensor, site DC-xx in the site key, as...") and never quotes DEQ's sentence with the school name attached.
C9 Constraint lint must not exceed baseline 52.
C10 Neutral language about communities. No community is "unhealthy" or "diseased".

## 3. DEQ limitation language: verbatim and attributed, in the report summary, every limitations box, and every sensor-data figure caption
"The sensors used in this project are not regulatory instruments as specified in the Code of Federal Regulations. They cannot be used in determining attainment or non-attainment of the National Ambient Air Quality Standards. Only Federal Reference/Equivalent Method designated monitors can." (Virginia DEQ)
Always pair with: A single hourly reading above 35 µg/m³ is not an exceedance of the 24-hour PM2.5 standard; the regulatory form is the annual 98th percentile of daily averages, averaged over three years. The separate annual standard is 9.0 µg/m³ (2024 revision).
Credit line until DEQ Communications supplies its preferred wording: "Sensor data: Virginia Department of Environmental Quality, Data Center Air Monitoring Project."

## 4. Validated results (the only analytical findings the report may state)
R1 Collocation reproduction, classified **Validated, at DEQ's published precision**, per GENARCH_RULES.md §9. That section governs; its wording, values and classification replace the figures this line used to carry.
  §9 verbatim: "The four collocation regressions at the Ashburn site agree with DEQ's coefficients within 0.05 on slope and intercept and 0.03 on R², computed from the source tables at build time through the 2026-08-07 07:00 EST edition cutoff and asserted in `DEQ_PUBLISHED` (`site/src/lib/deq-data.ts`). Drift outside tolerance fails the build."
  §9 verbatim: "DEQ publishes these coefficients to two significant figures, so the claim is that GENARCH's values round to DEQ's at DEQ's own precision. Agreement to three decimals is not verifiable against the source and must not be claimed. Two of the four are closed-window regressions whose published values cannot drift; the other two are open and refit weekly, so any comparison of those has to align cutoffs first."

| Comparison | DEQ | Recomputed | n |
|---|---|---|---|
| APEX 14 PM2.5 | y = 1.3 + 0.83x, R² = 0.73 | y = 1.299 + 0.831x, R² = 0.725 | 697 |
| APEX 5 PM2.5 | y = −4.7 + 1.7x, R² = 0.84 | y = −4.678 + 1.665x, R² = 0.837 | 2,111 |
| APEX 14 NO2 | y = 2.2 + 1.1x, R² = 0.49 | y = 2.186 + 1.075x, R² = 0.497 | 589 |
| APEX 5 NO2 | y = 1.8 + 0.32x, R² = 0.21 (corrected 2026-08-19) | y = 1.835 + 0.319x, R² = 0.207 | 2,745 |

  In place of a count: §9 verbatim, "The two APEX 14 rows are identical in every edition because no later data can enter a closed window; the two APEX 5 rows move in every edition because more data does. Describe the four regressions in those terms. Do not describe them as a count of how many currently match."
  Method, per §9 and `getCollocation()`: pair on ts_est; apply excluded flags on both sides; assign collocation periods by unit_id from the occupancy table; OLS with sensor on x; every fit stops at the 2026-08-07 07:00 EST edition cutoff; exact zeros are retained in APEX 5 NO2 and in nothing else (DEQ staff, 2026-08-19). The date-window alternative and its unresolved two-hour difference are in GENARCH_RULES.md §11.
R2 Daily-average reconciliation, per AUDIT round 2 Task 1c: recomputed daily PM2.5 averages for the Broad Run HS regulatory monitor match DEQ's published dailyAvg file on 118 of 119 comparable days after truncation to one decimal, mean absolute difference 0.0017 µg/m³, over 2026-03-03 to 2026-08-09. Comparable means the published day survives DEQ's null-code and `<` exclusions and the recomputed day clears 18 of 24 valid hours. The one mismatch is 2026-03-10, recomputed 5.0 against a published 5.2 at 23 valid hours. The earlier 126-of-131 figure, mean absolute difference 0.0099, reproduces over the same 2026-03-03 to 2026-08-09 range but applies no completeness threshold and reads the published file unfiltered, which GENARCH_RULES.md §3 rules out; it is superseded.
R3 Record-length sensitivity in a superseded DEQ table. DEQ's weekly report of 2026-08-07 (Table 4) identified one sensor as the only sensor whose daily PM2.5 98th percentile exceeded 35 µg/m³. On the common window when all six sensors were running (2026-06-18 to 2026-08-07), five of six exceed 35 under both local standard time and local clock time day definitions, and that sensor ranks fourth. The common-window 98th percentiles, ranked, on whole days through 2026-08-07 with 18-of-24 completeness and exact zeros treated as missing (AUDIT round 2 Task 1a; valid days in brackets):
  - Local standard time days: farmwell-middle 45.402 [50], belfort-park 40.189 [50], golf-course 40.123 [51], sterling-ms 38.215 [51], ashburn-collocated 37.097 [51], dulles-area 29.500 [50].
  - Local clock time days: farmwell-middle 47.916 [50], belfort-park 42.689 [50], golf-course 42.620 [51], sterling-ms 40.442 [51], ashburn-collocated 39.167 [51], dulles-area 31.783 [49].
  Clock binning raises every site by 1.3 to 2.6 µg/m³ and reorders nothing. sterling-ms is the Table 4 sensor and is fourth under both definitions. Its record was 51 days, entirely in high summer, including the 2026-07-16 to 07-19 wildfire smoke weekend, against 84–152 days for the others. DEQ's 2026-10-09 report, computed on longer records, lists no site above 35. The comparison in the earlier table did not hold on a common window; a short-record 98th percentile depends on the season the record covers.
  Mandatory caveat 1 (same paragraph): neither DEQ's figure nor GENARCH's is NAAQS-comparable.
  Mandatory caveat 2 (same paragraph): DEQ's table reported each sensor's value over its own record. The comparison between sensors did not hold because the records differed in length and season. This is not a claim that DEQ's figures were wrong or that any site is polluted.
  Day-set convention: counts and values use whole days through 2026-08-07. DEQ's edition cutoff was 07:00 on 2026-08-07; under that cutoff the record lengths are 50 and 83–151 days, and the result is unchanged (5 of 6 above 35; the Table 4 sensor ranks fourth under both day definitions). Every sentence comparing GENARCH and DEQ values names DEQ_EDITION_CUTOFF.
R4 Cross-site PM2.5 correlation 0.886–0.966 across six sensors, non-smoke hours, zeros treated as missing. Descriptive only; high correlation does not establish the absence of a local contribution.
The values above come from the August 2026 analysis. The report uses values recomputed by pipeline.report at the data freeze. R1–R3 are also reported on their original windows so they stay comparable to the DEQ documents they check.

## 5. Claims that must not appear as claims
X1 The sensor under-reported during the smoke event (both instruments are optical; neither is gravimetric).
X2 No localized elevation exists in the record.
X3 A nocturnal-inversion pattern holds network-wide (diurnal shapes differ by site).
X4 The max/min cross-site ratio discriminates sources below ~30 µg/m³ (median ratio 1.82; low-concentration hours give spurious ratios up to 10).
X5 The sensor-versus-reference comparison is novel (DEQ publishes it weekly).
X1–X4 may appear only in report §5.6 as hypotheses tested and not supported, each with the reason.
X6 Any "first" claim. Use: "To our knowledge, no independent reprocessing of the Project's sensor data has been published."
X7 Any cross-ancestry gene–environment effect estimate (none computed in v1).
X8 Any causal verb linking the corridor, facilities, or sensor readings to health outcomes (causes, drives, leads to, responsible for, harms, increases risk of).
X9 Never state or imply that DEQ's current published tables contain an error, or that DEQ revised any table because of GENARCH.

## 6. Open items disclosed in Limitations
- Whether DEQ's collocation plots carried axis limits; if so, the exact matches may reproduce fits on a clipped range. Awaiting DEQ.
- Regulatory monitor data (FOIA 26-4646) end 2026-08-10, capping collocation and daily reconciliation.
- The CO section of DEQ's 2026-09-04 report is not analyzed (averaging-period conflict, GENARCH_RULES.md §4).
- The Kunak dashboard backfills published hours without notice; every input records its export date and data cutoff.
- The Kunak dashboard backfilled 9 previously missing hours with all-zero rows. GENARCH treats all-zero rows as missing (GENARCH_RULES.md §4).
- Network reconfiguration on 2026-09-17: three sites offline, three online. The new sites' county is as determined in AUDIT.md.
- GENARCH partially reproduces DEQ Table 4 (2026-08-07). Local clock time days with exact zeros treated as missing reproduce five of the six live sites within 0.05 on whole days through 2026-08-07, leaving farmwell-middle at +0.20, and no single combination reproduces all nine rows. The day boundary accounts for most of the 1–2 µg/m³ offset; zero handling is minor and inconsistent. The three sites whose PM2.5 record ended before that edition reproduce only under local standard time days, their record-day counts and end dates are identical under both day definitions, and no end date brings them within 0.05 under clock days, so that difference is unexplained. Report as partial reproduction; never "fully explained".

## 7. Scope of v1
In: atlas scope, methods, module inventory, DEQ reprocessing (R1–R4), five-step mechanism chain with evidence grades, ancestry composition of the GWAS evidence base (descriptive), limitations, roadmap.
  Scope of the DEQ reprocessing: Loudoun County sites of the Data Center Air Monitoring Project; the Project's study area was retitled "Loudoun County and Prince William County" in DEQ's 2026-10-09 report, and the three Prince William County sites are outside v1 scope.
Out: cross-ancestry GxE estimates; the apex-06 paired-site analysis; CO; any tract-level exposure–prevalence association.

## 8. Prose rules
Plain, declarative, specific. No significance inflation (groundbreaking, critical, pivotal, landmark, crucial), no promotional tone, no rule-of-three padding, no "not only... but also", at most one em dash per paragraph, no stacked hedges. Every number in report prose comes from data/reports/2026/numbers.json through the <N> component; no hand-typed decimals. The cover states "Not peer reviewed." Author: Kiaan Saraiya, ORCID 0009-0005-1913-0870, affiliation "Independent; GENARCH project". Acknowledge no person who has not agreed to be named.
