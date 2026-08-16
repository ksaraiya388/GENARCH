# GENARCH — STANDING RULES

Last updated 2026-08-16. Supersedes all earlier rule statements in chat.

Sections 1 and 3 are enforcement rules: they belong in code as validator checks, not in your head. Sections 2, 4, and 5 are judgment rules that apply when writing. Section 7 is what is still unknown.

Anything in Section 3 that is marked *agency-confirmed* came from Virginia DEQ staff and can be cited. Anything marked *my inference* cannot.

---

## 1. Project constraints (immutable, four-year charter)

Locked in `docs/CHARTER.md`. These override anything else in this document.

1. **No causal claims.** Describe co-location and mechanism. State this in the first paragraph of every artifact.
2. **Never name a specific facility as harming specific people.** Describe the corridor, not the company.
3. **Sensor limitations stated first**, using DEQ's own language verbatim. See Section 5.
4. **No policy position on data centers.** Neutral, mechanistic, sourced.
5. **Population-level only.** No individual risk, no diagnosis.
6. **Explicit ecological-fallacy disclosure** wherever tract-level exposure and tract-level prevalence appear together.

---

## 2. Claims you cannot make

Each of these is a specific thing that would be wrong or unsupportable, not a general caution.

**"The sensor under-reported during the smoke event."** Both instruments are optical. The T640X is a federal equivalent method, but FEM designation rests on comparison to gravimetric FRM under typical conditions, not smoke aerosol. Which instrument is closer to true mass during that episode is not determinable from these two series. Say the two diverged by a factor of about 2.3 at peak and that the divergence is concentration-dependent. Stop there.

**"Nobody has published this comparison."** DEQ plots sensor and regulatory data together in its weekly Friday report. Before claiming novelty, read several weekly reports and determine specifically whether DEQ publishes any regression, correlation, or bias statistic, or only plots. That determination sets what you can claim.

**"July 17 was an exceedance of the 24-hour standard."** A single day above 35 µg/m³ is not an exceedance. The regulatory form is the 98th percentile averaged over three years. The annual standard is 9.0 µg/m³ as revised in 2024.

**"DEQ classified these as exceptional events."** DEQ does not make that determination; EPA does. DEQ staff is unaware whether a request has been made. State it that way.

**"Loudoun is a PM2.5 hotspot."** The design value is around 7.0 µg/m³, below federal standards. The defensible thesis is that PM2.5 health associations persist below regulatory thresholds, which makes genotype-dependent response the open question.

**Any pooled statistic spanning the smoke window and ordinary conditions.** The pooled slope of 0.515 sits between two regimes and describes neither. Report with and without, always both, never the pooled figure alone.

---

## 3. DEQ regulatory data — validity rules

Source: DEQ staff email, 2026-08-12, with attached flag reference table. Agency-confirmed unless marked otherwise.

### The exclusion rule

```
EXCLUDE a reading if and only if:
    Value is NaN, OR
    AQS Null Code is present, OR
    Flags contains "<"

Do NOT exclude on any letter code alone.
```

`<` means Logger Invalid. `>` means some minute data is missing but the hour is still valid. `<>` contains `<` and is therefore excluded.

A letter identifies the event; the comparator determines validity. `P` is Power Failure. `P<` means the power issue exceeded 15 minutes and the hour is invalid. `P>` means it did not and the hour stands. The same logic governs every letter.

### Corrections to earlier instructions

I previously told you to exclude all rows flagged `C`. That was wrong. DEQ confirmed `C` marks automated precision, zero, and span checks, but only `C<` is invalid. `C>` rows are valid ambient data and stay in. Any analysis run before 2026-08-12 that applied a blanket `C` exclusion needs rerunning. That affects the NO2 collocation result.

### Flags are case-sensitive

The table pairs distinct meanings on the same letter:

| Upper | Meaning | Lower | Meaning |
|---|---|---|---|
| `C` | Calibration | `c` | Ceiling Limit |
| `H` | High-High Alarm | `h` | High Alarm |
| `M` | Maintenance | `m` | Marked Maint by edit |
| `P` | Power Failure | `p` | Precision Check |
| `Z` | Instrument alarm present | `z` | Zero Adjusted |
| `I` | Invalidated By Edit | `l` | Low Alarm |

Never call `.lower()` on a flag string. Never use a case-insensitive regex on this column. `I` and `l` are visually near-identical in most fonts, which makes this failure silent.

`I` should always be accompanied by a null code, so exclude on null codes first.

### Completeness threshold

A 24-hour average requires **18 of 24 valid hours**. Agency-confirmed.

The published `dailyAvg` file applies no threshold and is itself unfiltered — it reports values computed from as little as one valid hour (2026-05-10). Apply the null-code and `<` exclusions to the daily file before using it, or recompute from hourly with the 18/24 rule.

### Truncation

DEQ truncates published values to one decimal. Do not round. Recomputed daily averages matched DEQ's published file on 126 of 131 days after accounting for truncation, mean absolute delta 0.0099 µg/m³.

### Units

NO2 in ppb. CO in ppm. PM2.5 in µg/m³. Agency-confirmed.

### Record endpoint

The hourly files run to 2026-08-10 23:00, but the last row carrying a value is 2026-08-10 09:00 because DEQ ran the export around 10:00 that morning. The last complete day is 2026-08-09. Trailing empty rows are padding, not missing data.

### Qualifier codes

Informational, applied by data validators. `IF` is "Fire — Canadian, informational only." Reference: EPA AQS qualifier code list.

---

## 4. Kunak sensor data

### Timestamp normalization

```
Kunak values are HOUR-ENDING and DST-adjusted.
Regulatory values are HOUR-BEGINNING and always EST.

Before any comparison or 24-hour averaging, shift Kunak timestamps:
    before 2026-03-08 03:00     -> back 1 hour
    on/after 2026-03-08 03:00   -> back 2 hours

Store both raw and normalized. Never overwrite raw.
Emit the shift applied per row in provenance.
```

Hard-fail validation if any comparison joins a Kunak reading to a regulatory reading on unnormalized timestamps.

Applying the shift raises PM2.5 correlation from 0.861 to 0.889. Adjacent shifts score within 0.001 of each other, so the improvement confirms a shift is needed but does not independently validate the specific boundary. Use DEQ's instruction and cite DEQ.

### No QC flags

Kunak files carry no null code, flag, or qualifier column. DEQ's dashboard states the values are published as detected and have not passed quality assurance validation. Regulatory and sensor data are therefore not symmetric, and any disagreement between them has at least three candidate explanations: sensor accuracy, absence of QA on one side, and timestamp convention. Do not attribute disagreement to sensor performance alone.

### Zeros

Broad Run HS reports exact `0.0` on PM2.5 (53 rows), NO2 (780 rows, 20.2%), and VOCs (194 rows). No row has all three at zero, so these are per-pollutant floor clamping rather than device outage. Excluding them shifts the sensor mean by roughly 0.1 µg/m³. Whichever treatment you choose, state it.

### Duplicates

The Broad Run HS export returned 4,721 rows against 3,862 unique timestamps. All 1,718 duplicate rows are exact across every column, confined to 2026-03-03 through 2026-04-07, 48 rows per day. Pagination artifact. Deduplicate on all columns. Check every file for this pattern, not just this one.

### Known gaps

2026-03-08 02:00 does not exist in local time (spring forward). 2026-04-21 08:00 is a genuine one-hour gap. Render gaps as gaps, never as zero, never interpolated. Report the excluded count alongside every statistic.

### Retired sites

Heritage Farm Museum, Newberry Condo Assoc, and Steuart Weller ES show "Location without device" on the dashboard. Whether their historical data is downloadable is unresolved. If it is not, state the gap explicitly rather than letting three missing site records read as no data.

### Not exportable

Meteorological data appears on the Latest data tab but not in the Historical data sensor selector. Record as a known gap. Wind-direction attribution is out of scope under Constraint 2 anyway.

### Averaging period mismatch

Kunak reports CO as an 8-hour average. The FOIA CO from Aurora Hills is 1-hour, and Aurora Hills is in Arlington, not Loudoun. CO is not part of the v1 story.

### VOCs

Broad Run HS VOC readings range from 0.27 ppb in March to 884.78 ppb in August. Three orders of magnitude, cause unknown. Record it. Do not use it.

---

## 5. Attribution and quoting

### DEQ limitation language

Quote **both paragraphs** from the dashboard Information tab, verbatim, including the "designed" typo that appears where "designated" is meant. Do not paraphrase, do not soften, do not add `[sic]`, do not correct it.

Include the closing sentence about the sensors remaining useful for general trends and concentrations. Omitting it is selective quoting in your own disfavor, and DEQ's own statement that the data are useful is the justification for the page existing.

**Copy the text directly from the browser.** Do not retype it and do not copy it from anything in a chat transcript. A transcription error inside a verbatim quote attributed to a state agency is not recoverable.

Cite: Virginia DEQ, Data Center Air Monitoring Project public dashboard, Information tab, retrieved 2026-08-11, with URL.

### License

```
"license": "Fully redistributable with credit that the data belong to
Virginia DEQ (per DEQ staff, 2026-08-10). Preferred attribution line
pending from DEQ Communications."
```

### Retrieval method, two entries

```
Kunak sensor data: public Kunak Cloud CSV export, method confirmed by
  DEQ staff 2026-08-10
Regulatory monitor data: Virginia FOIA request 26-4646, released in
  full 2026-08-11
```

FOIA 26-4646 and the released records are public at `vadeq.nextrequest.com/requests/26-4646`.

---

## 6. Presentation rules

**The July 16–19 window gets labeled inside the figure**, not in a caption below it. Three things must appear at the point of display: that DEQ's own `IF` qualifier identifies it as Canadian fire; that a single day above 35 µg/m³ is not an exceedance of the 24-hour standard; and that exceptional-event determination rests with EPA and is unresolved. This is the highest-magnitude number in the dataset and it originated 1,500 miles away.

**Every summary statistic is reported twice**, with and without the smoke window, both stated.

**Separate instrument classes physically.** Regulatory data in `deq-regulatory/`, sensor data in `deq-raw/`, separate tables downstream with an explicit `instrument_class` field. If they ever merge into one series, the DEQ CFR language becomes false on its face. Carry `Parameter`, `AQS Method Code`, and `Average Interval` through to the final table as the documentary basis for the distinction — the export supplies `PM25_T640X` / method 638, NO2 / method 212, CO / method 54.

**The NO2 result is a result, not a limitation.** It has an n and a correlation coefficient and you produced it. It belongs in the results section alongside the PM2.5 comparison. The limitations box holds DEQ's two verbatim paragraphs, the ecological-fallacy disclosure, and the sub-threshold framing.

**State the validation.** One sentence with the number: recomputed daily averages reproduce DEQ's published file on 126 of 131 days after truncation, mean absolute delta 0.0099 µg/m³. Almost nothing else on the page will carry that much weight per word.

---

## 7. Data handling conventions

### Folders

```
C:\Users\sarai\genarch-scratch\        <- run every script from here
    deq-raw\                            <- Kunak sensor CSVs only
    deq-regulatory\                     <- FOIA .xls files only
    deq-raw\_superseded\                <- archived partial pulls
```

Never run a script from inside a data folder. Relative paths resolve one level too deep and the failure looks like a missing file.

Never name a script `inspect.py`. It shadows the standard library module pandas imports, and the traceback points somewhere unrelated.

### Filenames

```
deq-raw\<site-slug>_<pollutant>_<start>_<end>.csv
```

Site slug must match `deq_sensor_site_history.csv` exactly. The reshape script derives `site_id` from the filename, and a mismatch breaks the occupancy join. Rename at download time, not later.

Current slugs: `ashburn-collocated` (Broad Run HS), `belfort-park`, `dulles-area`, `farmwell-middle` (Farmwell Station MS), `golf-course` (1757 Golf Club), `heritage-farm`, `newberry-condo`, `sterling-ms`, `steuart-weller`.

Add a `kunak_label` column to the site history carrying Kunak's exact display strings so the join is a literal match rather than a paraphrase.

### Hard rules

**Never merge a relocated sensor's two site periods into one file.** Steuart Weller ends 2026-06-18; Sterling MS begins 2026-06-18. Newberry ends 2026-05-14; Belfort Park begins 2026-05-14. DEQ lists these as separate dashboard locations, so each download is already bounded — but verify per file rather than assuming.

**Never edit a downloaded file by hand.** All reshaping happens in a script. A hand-edited file cannot be regenerated and cannot be defended.

**Never commit a derived artifact that the pipeline cannot reproduce.** This is what produced the `graph.json` fossil: a committed file at 97 nodes and 165 edges against a clean rebuild at 72 and 211, unreconcilable. Pipeline output is canonical.

**Validate readings against site occupancy windows.** Any reading whose timestamp falls outside its site's occupancy window is a hard error, not a warning. This is the mechanical guard against the relocation splice.

**Do not trust a filename over the file's contents.** Verify the date range from the data.

---

## 8. Open questions

Blocking or near-blocking:

- Whether DEQ's weekly reports already publish agreement statistics. Determines what novelty you can claim. **Read them before writing the page.**
- Whether Heritage Farm Museum, Newberry Condo Assoc, and Steuart Weller ES appear in the Historical data Locations dropdown.
- The contradictory `sterling-ms` row in `deq_sensor_site_history.csv`, dated 2026-03-03, carrying the Dulles-area note and a malformed `apex-TO_CONFIRM` unit ID. Sterling MS cannot start 2026-03-03; Apex sensor 6 arrived 2026-06-18. This is the exact splice the file exists to prevent.
- Phase 2-REVISED and 2B fixes remain uncommitted in the working tree since 2026-08-10. Nothing is live.
- Whether the April 12 Newberry spike reported by Loudoun Now survives the corrected exclusion rule.
- Whether a July 4 weekend spike exists, per DEQ staff.

Not blocking:

- Preferred attribution line, pending from DEQ Communications.
- Whether met data is exportable by another route.
- Whether DEQ applies a completeness threshold before AQS submission.
- The load-bearing PM2.5 → IL-33 citation `10.1111/cei.12348`, which resolves to a mouse PM10 study and is misattributed across four repo files.
- `il1rl1.json` (ST2) has no curated gene file despite being the second link in the mechanism chain.

---

## 9. Results held so far

Marked by status. Nothing here is publishable until the corrected exclusion rule has been rerun.

**Validated.** Recomputed daily PM2.5 averages match DEQ's published file on 126 of 131 days after truncation to one decimal. Mean absolute delta 0.0099 µg/m³. The five mismatches are all partial days; only one has ≥18 valid hours, differing by 0.2.

**Resolved empirically.** DEQ's published daily average for 2026-07-17 is 170.8. Recomputing with the eight `h`-flagged hours included gives 170.8167, truncating to 170.8. Excluding them gives 129.89. DEQ includes `h`-flagged hours, so the 282.5 µg/m³ peak is agency-endorsed data.

**Provisional, pre-correction.** PM2.5 collocation outside the smoke window: n = 2,899, r = 0.846, slope 1.155, intercept −0.55, mean difference +0.42 on a regulatory mean of 6.31. The sensor-to-reference ratio rises monotonically from 0.81 below 3 µg/m³ to 1.13 above 10, crossing unity near 3.8. PM2.5 flags contain no `C`, so the correction should not move these numbers, but rerun and confirm.

**Provisional, pre-correction.** Smoke window: n = 96, slope 0.404, regulatory mean 69.02 against sensor mean 44.47. Peak hour 282.5 against 123.11.

**Provisional, pre-correction.** Six sensors during the smoke window peaked between 114.71 and 157.91. The reference monitor at one of those exact locations peaked at 282.5.

**Superseded, must rerun.** NO2 collocation: r = 0.420, slope 0.439, 780 of 3,862 sensor readings exactly zero against a regulatory mean of 3.87 ppb. This was computed with the incorrect blanket `C` exclusion and 51 valid `C>` rows were wrongly dropped.

---

## 10. Correspondence log

| Date | Source | Content |
|---|---|---|
| 2026-08-10 | DEQ staff | Kunak data redistributable with credit; public page offers 1-hour averages only; regulatory data requires FOIA; CFR limitation language supplied |
| 2026-08-11 | DEQ FOIA | Request 26-4646 released in full, no redactions, no cost, four files, coverage 2026-03-03 to 2026-08-10 |
| 2026-08-11 | DEQ staff | Timestamp convention difference and shift instruction; AQS Null Code and `<` flag both mean invalid |
| 2026-08-12 | DEQ staff | Flag reference table; comparator logic; `C<` only; 18/24 threshold; daily file unfiltered; units; `IF` = Fire — Canadian; exceptional events determined by EPA; pointer to weekly reports |

---

## 11. Outreach links

**One `/r/<code>` per recipient, never reused.** A forwarded link then stays attributable to the original send rather than merging two recipients into one path in Analytics. Codes live in `OUTREACH_CODES` in `site/src/app/r/[code]/page.tsx`; retire a code by leaving it in place, not by reassigning it.
