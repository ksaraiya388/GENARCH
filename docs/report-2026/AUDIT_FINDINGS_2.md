# GENARCH Annual Report 2026 v1.0, draft-5: adversarial audit findings (round 2)

Audited 2026-11-17 against `docs/report-2026/drafts/GENARCH_Annual_Report_2026_v1.0_draft-5.pdf`
(51 pages). Scope: everything changed in `git diff df4c05d..HEAD` (commits 4273a0d and 5d35b5e). Read
alongside CONTEXT.md, DECISIONS.md through D62, GENARCH_RULES.md (with the 2026-11-17 section 6
amendment), CONTENT_CONSTRAINTS.md, `numbers.json`, `tables.json`, `figures.json`, the T01–T12 CSVs,
the first-round `AUDIT_FINDINGS.md` and the AUDIT.md lines that mark each first-round item done.

How the checks were run:
- PDF text was extracted with pypdf, and every quoted string below was checked against the TSX under
  `site/src/content/reports/2026/`, `pipeline/report.py`, or the JSON it renders from. None is an
  extraction artifact.
- All 51 pages were rasterised with pypdfium2 for the layout pass.
- DOIs were checked through `api.crossref.org/works/<DOI>`. The eCFR text was read through the
  versioner API at 2026-10-01. URLs were requested with a generic client.
- `/community/data-center-alley` was checked in the built export at
  `site/out/community/data-center-alley/index.html` (built 2026-11-17 19:18).

Page numbers are the PDF's own "Page n of 51". Table numbers are the printed numbers, with the
generator ID in brackets where it differs.

---

## Blocking

### B1. Section 5.4 states the common-window result with the smoke window and without it in different paragraphs
- **Location:** §5.4, p. 18. `s5-dca.tsx`: the first `<P>` of `dca-record-length` ends "...or that any site is polluted." The smoke-excluded count opens the next `<P>`.
- **Quote:** paragraph 1: "...5 of the 6 exceed that level under the local standard time day definition and 5 under local clock time, and site DC-06 ranks fourth under both." Paragraph 2: "The smoke weekend accounts for that count. With the hours of the smoke window excluded (section 3.5), none of the sites has a common-window 98th percentile above 35 µg/m³..."
- **Rule:** CONTEXT §4 R3 amendment (D58): "R3 is always stated both ways, with and without the smoke window, in the same paragraph." D58: "Every common-window statement gives the result with the smoke window ... and without it, in the same paragraph." Task 3 also applies: paragraph 1 states the with-smoke count alone.
- **Fix:** move "With the smoke window excluded, none of the 6 is above that level under either day definition and site DC-06 still ranks fourth" (keys `p98.common_exsmoke.n_above_35`, `p98.common_clock_exsmoke.n_above_35`, `p98.common_exsmoke.rank.DC-06`) into paragraph 1, directly after "ranks fourth under both". Paragraph 2 can keep the explanation. The summary, §7.2, the Table 6 note and the community page already do this correctly.

### B2. The summary still calls the APEX 5 NO2 comparison values "published"
- **Location:** Summary, p. 2 (`summary.tsx`, an unchanged sentence). Table 3 [T03] Status cell for APEX 5 NO2 †, p. 15.
- **Quote:** "The four collocation regressions at the collocated site agree with DEQ's published coefficients within 0.05 on slope and intercept and 0.03 on R-squared, computed through DEQ's 2026-08-07 07:00 EST edition cutoff." Table 3, APEX 5 NO2 †: "matches DEQ at published precision".
- **Rule:**
  - D54: the APEX 5 NO2 DEQ values are staff correspondence, not published.
  - First-round B7 is marked done in AUDIT.md, but its point (do not present correspondence values as published) is not carried into the summary or the Status cell.
  - X9 and task 10: the coefficients DEQ printed for the 2026-08-07 window are y = 1.9 + 0.29x, R² 0.17 (GENARCH_RULES §9). Against those, GENARCH's R² of 0.207 is 0.037 away, which is outside the 0.03 tolerance. Read literally, the summary sentence is false for the one regression where it can be checked against print.
- **Fix:**
  - Summary: "...agree with DEQ's coefficients for that window (for the second unit's NO2 fit, the values DEQ staff supplied for it) within..."
  - T03 Status for the † column: "matches DEQ staff values at DEQ's precision".

### B3. Source F publishes the project's internal rules file, including a section held for correspondence
- **Location:** Sources F, p. 50: `https://github.com/ksaraiya388/GENARCH/blob/main/docs/GENARCH_RULES.md#10-correspondence-and-edition-log`. It is cited as [F] eleven times: §§3.2, 3.3, 3.4, 3.5, 5.2, the glossary and others.
- **Quote:** not reproduced here, so that this file does not carry the material it reports. The cited file on public `main` (repo visibility checked through `gh api`: public) contained, at the time of this audit:
  - a section held for correspondence, which characterised a DEQ edition's conclusion;
  - a school name beside a sensor reading count (§4);
  - an internal site slug beside DEQ percentile values (§9);
  - chat-register working instructions (§2 and §3).
- **Rule:**
  - X9, because a DEQ edition is characterised as erroneous.
  - C7, because an internal slug appears in public output reached from the report.
  - C8, because a school name sits beside a reading value.
  - The held section's own terms.
  - Task 7: the URL itself returned HTTP 503 to an automated client on 2026-11-17. The file content was confirmed through the GitHub API, so the address is live.
- **Fix:** do not link the rules file. Either cite the correspondence as "DEQ staff, correspondence with the author, 2026-08-10 to 2026-08-19; on file", with no URL, or publish a purpose-built log that holds only the dated facts the report cites. Then check that the main-branch rules file is acceptable as a public document at all.

### B4. The Table 3 note says why DEQ revised its figures, and implies the 2026-08-07 figures were wrong
- **Location:** Table 3 [T03] note †, p. 15 (`collocation_notes()` in `pipeline/report.py`). The same narrative appears in §7.3 item 1, p. 33 (unchanged since draft-3).
- **Quote:** "† The DEQ values for APEX 5 NO2 are the coefficients DEQ staff supplied on 2026-08-19 for the same window as the other three, after DEQ traced its 2026-08-07 figures to axis limits in its plotting call." §7.3: "The agency traced one earlier regression to limits in its plotting call that had bounded the model fit as well as the view."
- **Rule:**
  - D54: "No sentence says who asked DEQ or why it revised."
  - X9: read with Source F, titled "Correspondence with the GENARCH project", the note implies DEQ revised because of GENARCH.
  - Task 3: no sentence may imply a DEQ figure was wrong.
- **Fix:**
  - T03 note: "† The DEQ values for APEX 5 NO2 are those DEQ staff supplied on 2026-08-19 for the same window as the other three. DEQ's printed figures for that regression are in its 2026-08-21 edition (p. 14): y = 1.8 + 0.31x, R-squared 0.2, over a longer window ... not compared."
  - §7.3 item 1: "Whether DEQ's published collocation plots carried axis limits that also bounded the fit. Asked of DEQ; awaiting an answer."

---

## Should fix

### Smoke window (task 3)

S1. **§3.5 says the smoke window is not excluded from the percentile work.**
- **Location:** §3.5, p. 7 (unchanged since draft-3), against §5.4, Tables 5 and 6, Figure 4 and the summary.
- **Quote:** "The window is not excluded from the percentile work, where its presence inside a short record is the finding rather than a nuisance."
- **Problem:** §5.4 and the Table 5 and 6 notes send the reader to "(section 3.5)" for the exclusion. §3.5 defines it only for the correlation and only by local-standard-time day. §5.4 says "With the hours of the smoke window excluded", but the Table 6 note says whole days are "left out under the day definition in use". Hours or days, and LST or the day definition in use, are each stated two ways.
- **Rule:** internal consistency; task 10 (a DEQ analyst reads Methods first).
- **Fix:** rewrite §3.5 to say that the percentiles are reported both ways, and that the excluded set is the whole days 2026-07-16 to 2026-07-19 under the day definition in use. In §5.4, change "hours" to "days".

S2. **D61 exempts a GENARCH statistic that is not a reproduction, and §5.4 states that statistic one way.**
- **Location:** §5.4 paragraph 3, p. 18. Table 6 [T05] columns "DEQ-cutoff record days / 98th percentile" and "Rank".
- **Quote:** "Under DEQ's cutoff the record lengths shorten by a day at several sites and the result is unchanged: the same number of sites sit above the level, and site DC-06 still ranks fourth..."
- **Rule:** GENARCH_RULES §6 as amended exempts only "a statistic that reproduces a DEQ-published statistic". DEQ never published a common-window percentile, under any cutoff. The DEQ-cutoff common-window values are GENARCH's own descriptive statistic, so D61's exemption list misclassifies them. The sentence also states the with-smoke count alone (task 3).
- **Fix:** add `p98.common_exsmoke.*.deq_cutoff` (both day definitions) and state the result both ways in that sentence ("...the same number of sites sit above the level with the smoke window included, none with it excluded..."). Otherwise amend D61 with a reason that survives GENARCH_RULES §6's own wording.

S3. **The community page still gives one-way percentiles, and DEQ's figure now sits beside values that contradict it.**
- **Location:** `/community/data-center-alley`, section "What the 98th percentile points at".
- **Problem:**
  - The own-record and common-window table and chart are with smoke only, and the page says so: "The percentiles in the table below include that window."
  - So are the "13.27 µg/m³, against 0.35 to 2.33 µg/m³" and "up to 2.12 µg/m³" sentences.
  - Under the amended §6 these are GENARCH's own descriptive statistics and need both ways. AUDIT.md (S12, community page) recorded them and left them.
  - The page attributes to DEQ staff that pre-smoke percentiles "sat at or below about 20 µg/m³ everywhere". The new sentence beside it prints smoke-excluded values up to 24.356. GENARCH_RULES §10 logs the correspondence as "around or below 20".
- **What passes:** the new smoke-excluded sentence is correct. The built page's six values, ranks and count (none) equal `p98.common_exsmoke.*` exactly, no school name appears near any value, and the C-rules hold on the changed string.
- **Fix:** add smoke-excluded columns to the table, or add a sentence that gives both, from the same `getPercentiles()` path. Quote the correspondence as logged ("around or below 20").

S4. **"Both days the percentile is read from" is wrong at 51-day records.**
- **Location:** §5.4 paragraph 2, p. 18; `p98.common.sites_set_by_smoke_days`.
- **Quote:** "...at 6 of the 6 under local standard time and 6 under local clock time, both days the percentile is read from fall in the window."
- **Problem:** under linear interpolation the index is (n − 1) × 0.98. At n = 51 (DC-01, DC-06 and DC-09 under both definitions) that gives exactly 49.0, so the percentile is a single order statistic, the second-highest day. The upper neighbour carries weight 0. A DEQ analyst who recomputes will say that one day, not two, sets those three values.
- **Fix:** "the day or days the percentile is interpolated from (one at 51 days, two otherwise) fall in the window". Alternatively, report the count of sites whose non-zero-weight days are all smoke days.

### Numbers (task 1)

S5. **Hand-typed numbers in changed sentences, captions and notes, not covered by D50.**
- **Summary, p. 2:**
  - "across the nine Loudoun County sensor sites" (`network.loudoun_sites` exists).
  - "all six sensors were collecting".
  - "every pair of the six sensors".
- **§5.4, p. 18:**
  - "all six then-live sensors".
  - "for the other five".
  - "its position among the six".
- **§5.2:** "the same window as the other three [F]".
- **§5.2 callout:** "two sensors were placed at new sites".
- **§8 May 2027 item:** "the two sites", "twelve-month", "twelve months". The month and year are D50-exempt plans; the twelve-month record length is a measurement threshold.
- **T02 note (`site_key_notes()`):** "three sites", "sensor 8 at DC-07, sensor 10 at DC-08 and sensor 13 at DC-09". The unit numbers are data values. D55 says they are checked against the edition text, but no key holds them.
- **T03 note:** "the other three", "(p. 14)".
- **T05 note:** "The last three columns".
- **T06 caption:** "three defensible method combinations" (see S6).
- **T07 caption (`report.py:2351`):** "each pair of the six sensors".
- **Fix:** bind each to an existing key (`p98.common.n_sites`, `network.loudoun_sites`, `corr.n_pairs`) or a new one (`network.unit.DC-07` etc., `deq.aug21.page`). If page locators and the counts "three columns" or "the other three" are structural, extend D50 to say so.

S6. **The Table 5 [T06] caption no longer describes the table.**
- **Quote:** "The same statistic under three defensible method combinations..."
- **Problem:** draft-5 adds a fourth value column (local standard time, zeros missing, smoke window excluded). That column is not a method combination compared with DEQ. Table 5 also carries no smoke-excluded record-day count, which Table 6 does carry.
- **Fix:** "...under three defensible method combinations, plus the first of them with the smoke window excluded..." Add a smoke-excluded record-days column from keys.

S7. **0.028 against the printed values, which difference to 0.027.**
- **Location:** §5.4 paragraph 3: "their values differ by 0.028 µg/m³ under standard time".
- **Problem:** Table 6 prints 21.294 and 21.267, so a reader computes 0.027. The Table 6 note covers only "the rise from local standard time to local clock time". The first-round S3 fix does not cover this new instance.
- **Fix:** widen the note to "Differences quoted in section 5.4 are computed from unrounded percentiles", or print 0.027 from rounded values.

S8. **Table 12 prints a "T" inside the export date.**
- **Location:** Table 12 [T01], pp. 37–38, all twelve data-freeze rows.
- **Quote:** "2026-10-11T13:47:03-04:00". The note directly below it prints "2026-10-11 13:47:03-04:00".
- **Rule:** D51: "An ISO date-time prints with a space, not a 'T', in prose, captions and tables alike." The first-round S2 fix is marked done but does not reach this column.
- **Fix:** apply the D51 formatter to T01's Export date cells.

### Sources and provenance (task 7, 10)

S9. **The 2026-08-21 edition is an analysis input that is in neither the freeze nor Table 12.**
- **Location:** §2: "Every DEQ and sensor input the analysis reads is listed in Appendix A ... There are 26 such inputs". The Table 12 caption says the same.
- **Problem:** the `deq.aug21.apex-05_NO2.*` keys list `docs/deq-reports/2026-08-21_data_center_air_quality_analysis.pdf` (SHA-256 20083d86…) as their input. FREEZE.json has no entry for it (0 matches), and Table 12 has no row for it.
- **Fix:** pin the edition in FREEZE.json and add a Table 12 row, which makes `freeze.n_deq_inputs` 27. Otherwise change §2 and the caption to say that one transcribed edition is pinned by hash in its keys rather than in the freeze.

S10. **[11] does not support "association evidence from genome-wide studies".**
- **Location:** §5.7, p. 24.
- **Quote:** "...the disease link as association evidence from genome-wide studies [11]".
- **Problem:** [11] is Aneas et al. 2021, "Asthma-associated genetic variants induce IL33 differential expression through an enhancer-blocking regulatory region". It is a functional follow-up of GWAS loci, not a genome-wide association study (Crossref confirms the title). This was introduced by the first-round S25 fix.
- **Fix:** cite the GWAS Catalog release [K] or an IL33 asthma GWAS for the association, and keep [11] for the regulatory mechanism.

S11. **"A follow-up request ... is pending" is asserted twice with no record behind it.**
- **Location:** §2, p. 5; §7.2, p. 32.
- **Problem:** AUDIT.md (draft-4 follow-up, item 6) says the only request number supplied is the placeholder 26-NNNN. First-round M3 is marked done, but this part was left "unverified". A DEQ FOIA officer is the reader most likely to check it.
- **Fix:** give the request number and date, or remove both sentences until one exists.

### What a DEQ analyst would challenge first (task 10)

S12. **The summary hides the one "near" result.**
- **Problem:** the summary says all four regressions agree within tolerance. Table 3 labels APEX 14 NO2 "near", and §5.2 explains that its R² rounds to a different second decimal and moves under leave-one-out resampling. The first thing a DEQ analyst will do is compare the summary sentence with the Status row.
- **Fix:** add to the summary: "one R-squared, for the first unit's NO2 fit, lies inside tolerance but rounds to a different second decimal from DEQ's".

S13. **DEQ-cutoff percentiles rise when a day is removed, and no note says why.**
- **Location:** Table 6, every site.
- **Problem:** DC-01 local standard time goes from 51 days and 37.097 to 50 days and 38.167. DC-08 goes from 45.402 to 46.653. A DEQ analyst will read this as an error, because dropping the partial last day raises every p98 by about 1 µg/m³. The cause is the order-statistic position shifting with n (GENARCH_RULES §9), but nothing in the table says so.
- **Fix:** add a Table 6 note that ties the rise to the index (n − 1) × 0.98 moving across a smoke day.

---

## Minor

M1. **"a zero of 0 here"** (§6.3 callout, p. 28) renders from `a zero of <N k="ancestry.loci.17q12-21.south_asian.associations" />`. **Fix:** "a count of zero here" with `fmt="count"`, or drop the `<N>`.

M2. **§8 May 2027 item.**
- **Quote:** "sensor collection ended at the two sites that had collected since 2026-03-03, DC-01 and DC-02".
- **Problem:** DC-03, DC-05 and DC-07 also started 2026-03-03 (Table 2).
- **Fix:** "the two sites still collecting that had collected since 2026-03-03".

M3. **The DEQ limitation attribution cannot be resolved to a Sources entry.** The attribution reads "(Virginia DEQ, Data Center Air Monitoring Project weekly report, 2026-10-09, p. 2)", as CONTEXT §3 prescribes, in all six places. Source C is titled "Data Center Air Quality Analysis" (D56), and the attribution carries no [C] label. **Fix:** append `<Cite id="deq2026oct09"/>` after the attribution so the reader can find it.

M4. **Source O note** says "introduced in literature entry Mills 2020". **Fix:** "[7]", matching the numbered list (first-round B5).

M5. **The Figure 6 note carries the wrong caveat and repeats a sentence.**
- **Quote:** the F06 limitation opens "these are counts of people enrolled and associations declared".
- **Problem:** Figure 6 shows no association counts, and its lower panel is residents. This is the same defect as first-round S28, fixed in T12 but not here. The two ACS sentences also print twice (caption and note).
- **Fix:** "these are study sample sizes and resident counts"; print the ACS sentences once.

M6. **Layout (task 9).** All 51 pages were checked as images.
- **Near-empty pages:**
  - p. 13 carries one five-line paragraph and is otherwise blank, because Figure 2 is pushed to p. 14.
  - p. 25 carries three short paragraphs.
  - p. 10 is half empty before Figure 1.
- **Figure 4:** the DC-01 smoke-excluded triangle sits directly under the own-record dot, so their stems overlap; it is legible. The DC-06 own-record dot reads inside the hollow square, as intended.
- **What passes:** no text is clipped. No heading or callout is left alone at a page foot (the summary exclusions box keeps with its paragraph). Every empty-looking cell carries a reason ("n/a", "open at freeze", "outside scope", "not confirmed", "see DP05", "no single-category rows", "not applicable"). The transposed Tables 3 and 10 fit inside the measure, with no mid-word hyphenation (D62).
- **Fix:** let §5.2's second paragraph and the Figure 2 block share a page, or move the 5.3 lead-in up. Offset the DC-01 triangle stem in Figure 4.

M7. **Loudoun-only keys list Prince William exports as inputs.** `summary.share_site_days_below_35` and `p98.common_exsmoke.*` list the DC-10, DC-11 and DC-12 freeze exports in `inputs`. Their values are Loudoun only (1,231 = the sum of the nine Loudoun record days in Table 2). **Fix:** list only the exports a key reads. That keeps D5/D52 clean in published provenance.

M8. **Table 6 "Rank" header is ambiguous.** It does not say whether it ranks the whole-day or the DEQ-cutoff values. The ranks are identical here, but the header should say. **Fix:** "Rank (whole days and DEQ cutoff)".

M9. **§7.2 does not name its window.**
- **Quote:** "The sensor records differ in length, from 51 to 152 complete days".
- **Problem:** this counts whole days through 2026-08-07. Table 2 prints 66 to 215 over the full frozen record.
- **Fix:** "...on whole days through 2026-08-07".

M10. **Source N names a company beside "Health ... Impacts".**
- **Quote:** "Air Quality, Health, and Economic Impacts of the Vantage Data Center Facility".
- **Status:** permitted, because it is quoted citation material (CONTENT_CONSTRAINTS §3 and §8, and the lint does not scan it). Verified: the PDF resolves (200), and the title, authors (Cork, Dominici), date 2026-02-27, the Loudoun County facility, permit-based emissions and COBRA all match the entry and §5.8.
- **Why flag it:** it is the only place a company name reaches the report next to a health term, so the author should knowingly accept it under C2.

M11. **Prose, changed sentences (CONTEXT §8).** §5.4 adds a three-part list: "in length, in season and in how much weight the smoke weekend carried in each". The summary uses the two-part form. **Fix:** match the summary. There is no significance inflation, the em-dash count is within limit, and there are no stacked hedges.

---

## Item 8: first-round findings marked done in AUDIT.md but not done in draft-5

| Finding | State in draft-5 |
|---|---|
| B7 | Not carried into the summary ("DEQ's published coefficients") or the T03 Status cell (B2 above). |
| S2 | D51 "T" separator still in the Table 12 Export date cells (S8 above). |
| S3 | Fixed for the rise; the new 0.028 has the same problem (S7 above). |
| S12 | §3.5 still says the window is not excluded from the percentile work (S1 above); community page table still one-way (S3 above, recorded rather than done). |
| S25 | [11] now carries a claim it does not support (S10 above). |
| S34 | One input, the 2026-08-21 edition, is outside both the freeze and Table 12 (S9 above). |
| S37 | The revision narrative is back in the new T03 note and in §7.3 (B4 above). The new correspondence source links the internal rules file (B3 above). |
| M3 | "Follow-up request is pending" left unverified, as AUDIT.md admits (S11 above). |
| M7 | Table header hyphenation is now resolved by D62. Every other M7 item is done. |

Every other first-round item was checked against draft-5 and is done, including:
- **B1:** date 2026-11-16, after the 2026-11-06 edition.
- **B2:** attribution in the summary and §7 boxes.
- **B3:** 40 CFR 50.20.
- **B4:** authors and DOIs.
- **B5:** numbered list.
- **B6:** Hodgson removed, [P] cited in §1.
- **B8:** no count framing.
- **B9:** the reworded 17q12-21 callout, apart from M1.
- **S4–S6, S9–S11, S13–S24, S26–S33, S35, S36, S38, S39.**
- **M1, M2, M4–M6, M8–M13.**

## Item 7: references added or changed since draft-3

| Entry | Check | Result |
|---|---|---|
| I. 40 CFR 50.20 | eCFR versioner API, 2026-10-01 | Title "National primary ambient air quality standards for PM2.5"; 9.0 µg/m³ annual, 35 µg/m³ 24-hour; [89 FR 16380, Mar. 6, 2024]. Entry matches. URL 200. |
| B. DEQ 2026-08-21 edition | URL | Project page returns 403: unverified, not failed. Archive path and SHA-256 given (D56). |
| [13] De la Fuente et al. 2015 | Crossref 10.1016/j.cytogfr.2015.07.017 | Title, authors De la Fuente / MacDonald / Hermoso, 2015, Cytokine & Growth Factor Reviews. Matches. |
| [9] Song, [11] Aneas, [12] MacIntyre, [10] Shadie | Crossref | First author, title and year match. On [11], see S10. |
| N. Cork & Dominici / EmPower for PEC | URL, PDF front matter | 200, application/pdf. Title, authors and the 2026-02-27 date match. |
| L. ACS 2020–2024 5-year | Census release notices | Public release 2026-01-29 confirmed. API URL 200. |
| O. GWAS Diversity Monitor 2024-09 snapshot | URL | 200 (live dashboard). The 2024-09 snapshot itself cannot be verified from the live site. |
| F. DEQ correspondence | URL | 503 to an automated client. Content confirmed public via the GitHub API. Blocking on content (B3). |
| C, D, E. DEQ documents 39287, 39902, 39963 | URL | 403: unverified, not failed. Check by hand in a browser (D56). |
| G, H, K, M, P | URL | 200 each. |

## Checked and passing

**Tables 3 and 10, transposed (task 5):**
- Every cell of Table 3 equals `T03_collocation.csv`: 4 regressions × 13 statistics, plus status.
- Every cell of Table 10 equals `T11_loci_by_ancestry.csv`: 5 loci × 14 rows.
- Tables 5, 6 and 7 also equal their CSVs in every cell.

**DEQ limitation (task 4):**
- Verbatim against the ingested 2026-10-09 edition p. 2 text.
- Attributed in the summary box, the §7 box and the Figure 1, 2, 4 and 5 captions: 6 occurrences, equal to the post-check's required 4 + 2 (D57).
- Figure 3 carries the regulatory-data note instead, naming the FEM monitor and FOIA 26-4646.
- The NAAQS pairing and credit line are present each time.

**Smoke window, both ways (task 3):** given correctly in:
- the summary share (99.11 percent of 1,231, and all 1,207 with the window excluded);
- the summary R3 and correlation sentences;
- §5.5, §7.2, Figure 4 alt and caption, Figure 5 caption, Table 6 note and Table 7.

D61 exemptions are applied correctly to R1, R2, the own-record reproduction columns and record-day counts, except for S2. Apart from B4, no sentence implies a DEQ figure was wrong.

**Numbers:**
- Every `<N>` in the changed prose resolves.
- Prose restatements match the tables: the 2.069–2.514 rise, the 0.225 maximum, 16.644–24.356, 0.346–2.372, 1,139–3,495 hours and 0.959–0.991.
- 160 = 119 + 38 + 2 + 1 calendar days.

**C1–C10 and X1–X8 on changed strings:**
- C9: the constraint lint reports 52 violations, 52 baselined, 0 new.
- The mojibake check passes.
- No site slug or school name appears in the PDF text outside Table 2.
- X1–X4 appear only in §5.6.
- X6 is worded as ruled.
- D29 and C5 hold: no individual-risk or clinical language.

**`/community/data-center-alley` (task 6):**
- The smoke-excluded values, ranks and count equal `p98.common_exsmoke.*`.
- No school name is within reach of a value.
- The new sentence passes the C-rules.

---

## Count

| Severity | Count |
|---|---|
| Blocking | 4 |
| Should fix | 13 |
| Minor | 11 |
| **Total** | **28** |
