# GENARCH Annual Report 2026 v1.0, draft-3: adversarial audit findings

Audited 2026-11-15 against `docs/report-2026/drafts/GENARCH_Annual_Report_2026_v1.0_draft-3.pdf`
(47 pages), the TSX under `site/src/content/reports/2026/`, `references.json`, `data/reports/2026/`
(FREEZE, numbers, inventory, chain, tables, figures, T01–T12 CSVs, F01–F06), CONTEXT.md,
DECISIONS.md through D49, GENARCH_RULES.md, CONTENT_CONSTRAINTS.md and the ingested DEQ editions
under `pipeline/sources/deq/`. PDF text was extracted with pypdf, and pages were rasterised with
pypdfium2 for the layout pass. I checked every quoted string against the TSX source or the JSON it
renders from, and none of the findings below is a pypdf extraction artifact. DOIs were resolved
through `api.crossref.org/works/<DOI>`. eCFR text was read through the eCFR versioner API at
2026-10-01. Source URLs were requested with a generic client.

Page numbers are the PDF's own "Page n of 47". Table numbers are the printed (D47) numbers, with
the generator ID in brackets.

---

## Blocking

### B1. Cover and changelog dated before an edition the report cites
- **Location:** cover (p. 1, "DATE 2026-11-04"); Appendix D (p. 44, "Version 1.0, 2026-11-04"); `frontmatter.json` `date`.
- **Quoted:** "Version 1.0, 2026-11-04. First release." The body cites DEQ's 2026-11-06 edition [D], retrieved 2026-11-08 (§5.2 callout, §8 roadmap, Sources D).
- **Rule:** internal consistency (task 8/10). A version cannot cite a document published two days after its own date.
- **Fix:** set `frontmatter.date` to the actual build or release date (on or after 2026-11-08). The cover, changelog, APA citation and BibTeX all follow from it.

### B2. DEQ limitation printed without its citation in the summary and the §7 box
- **Location:** Summary box (p. 2); §7 opening box (p. 29). Both render `<DeqLimitation>`.
- **Quoted:** the verbatim paragraph ends "...Only Federal Reference/Equivalent Method designated monitors can." and is followed by the NAAQS pairing and the credit line. The "(Virginia DEQ, Data Center Air Monitoring Project weekly report, 2026-10-09, p. 2)" attribution is missing from both boxes. It appears only in the figure captions.
- **Rule:** D24 and CONTEXT §3 ("verbatim and attributed, in the report summary, every limitations box, and every sensor-data figure caption"); task 3.
- **Fix:** have `DeqLimitation` print the attribution (or `<Cite id="deq2026oct09"/>` with `<EditionDate>` and "p. 2") directly after the quote in both boxes. Wording, figure-caption placement and absence from Figure 6 all pass.

### B3. 40 CFR 50.18 cited for the 9.0 µg/m³ annual standard
- **Location:** Summary (p. 2, "[G]"); §7.1 (p. 29, "as revised in 2024 [G][H]"); Sources G (p. 47); `numbers.json` `naaqs.*` method text (D32).
- **Quoted:** "G. ... 40 CFR 50.18: national primary and secondary ambient air quality standards for PM2.5 ... Cited for the levels of the annual and 24-hour standards."
- **Rule:** no uncited or miscited claims (C/CLAUDE.md 5); task 7. eCFR at 2026-10-01: §50.18 sets the annual standard at **12.0 µg/m³** (78 FR 3277, 2013). The 9.0 µg/m³ annual standard is **§50.20** (89 FR 16380, 2024-03-06). The entry's title is also wrong: §50.18 is "National primary ambient air quality standards for PM2.5", and §50.20 carries the same title.
- **Fix:** re-point the entry to 40 CFR 50.20 with its eCFR URL and title, re-key it (`cfr5020`), and correct the method strings of the `naaqs.annual_standard` and `naaqs.daily_standard` keys.

### B4. Four literature entries fail Crossref (first author or title)
- **Location:** References, Literature (pp. 45–46). These are the four `atlas-record` entries taken from `data/briefs/pm25-il33-nfkb-asthma.json`.
- **Quoted versus Crossref:**
  - "Li R, et al. (2017) ... 10.1016/j.etap.2017.02.011". Crossref first author: **Song, Lei**.
  - "Alvarez M, et al. (2021) ... 10.1038/s41467-021-26347-z". Crossref first author: **Aneas, Ivy**.
  - "Islam T, et al. (2014) ... 10.1289/ehp.1307459". Crossref first author: **MacIntyre, Elaina A.** The title also omits the subtitle "...: The Traffic, Asthma and Genetics (TAG) Study".
  - "Cayrol C, Girard JP (2018). The IL-33/ST2 axis: Role in health and disease ... 10.1016/j.cytogfr.2018.01.001". This DOI resolves to **"The enigmatic role of IL-38 in inflammatory diseases" (Garraud et al.)**: a different paper.
  - The other ten entries (Martin, Duncan, Privé, Ding, Kachuri, Fatumo, Mills, NASEM, Hodgson, Shadie) match on title, first author and year.
- **Rule:** task 7; D31; no uncited claims. The `atlas-record` method passed the published brief's errors straight into the report.
- **Fix:** correct the authors on the three entries. Find the real DOI for the IL-33/ST2 review, or replace the citation. Re-verify all five brief-derived entries against Crossref and switch them to `method: crossref`. File the brief-record errors against `pm25-il33-nfkb-asthma.json` as a separate atlas fix.

### B5. Literature list is unnumbered, so the body's [1]–[14] cannot be resolved
- **Location:** References (pp. 45–46) against every numeric citation in §5.7 and §6.3.
- **Quoted:** body "[10][11][14]", "[12][13]", "[1][2][3][4]", "[6][5]", "[8]", "[7]". The list prints entries with no numerals. The Sources list does carry letters A–M.
- **Rule:** task 7 ("every citation label in the body resolves to an entry"). A reader cannot tell that [11] is Shadie.
- **Fix:** render the literature list with its numeric labels (`[1]`…), in the order the `Cite` component numbers them.

### B6. Two reference entries are never cited
- **Location:** Literature entry 9 (Hodgson 2024, type 2 diabetes in South Asians) and Sources entry M (GENARCH atlas, genarch.org).
- **Rule:** task 7 ("every entry is cited at least once"). Neither `hodgson2024` nor `genarchatlas` appears in any `<Cite>` in the TSX. Hodgson is also off-topic for an asthma-only module.
- **Fix:** remove `hodgson2024`. Either cite `genarchatlas` in §1, where the atlas is introduced, or remove it.

### B7. The APEX 5 NO2 "DEQ" coefficients are presented as published, but they come from correspondence
- **Location:** Table 3 [T03] (p. 13, row "APEX 5 NO2 ... 1.8 0.32 0.21"); source line "against DEQ's published coefficients"; Figure 2 panel "DEQ: y = 1.8 + 0.32x, R² = 0.21" and caption "DEQ's published equation"; §5.2 "DEQ publishes four regressions".
- **Rule:** GENARCH_RULES §9 records 1.8 + 0.32x, R² 0.21 as the 2026-08-19 **staff correspondence** values on the Aug-7 window. The first printed correction is the 2026-08-21 edition at **1.8 + 0.31x, R² 0.2**, over a longer window. D24 (no email-supplied text quoted as published) applies by analogy. A DEQ analyst would check this row first and fail to find it in any edition.
- **Fix:** label that row's DEQ column "DEQ, staff correspondence 2026-08-19 (Aug-7 window)". In the table, the figure panel and §5.2, state that DEQ's printed correction (2026-08-21 edition) is 1.8 + 0.31x, R² 0.2 over a longer window and is deliberately not compared (GENARCH_RULES §9). Add the 2026-08-21 edition to Sources with `<EditionDate>`. §5.2 already says "The correction is in print in DEQ's own later edition, which is what this report cites", but no citation follows that sentence and no such entry exists.

### B8. Count framing of the collocation result
- **Location:** §5.2 (p. 13).
- **Quoted:** "One of the four does not round to DEQ's printed value." This follows directly on p. 11: "...it is the reason this report does not report how many of the four currently agree."
- **Rule:** GENARCH_RULES §9 ("Do not describe them as a count of how many currently match"); task 4.
- **Fix:** "The NO2 fit on the first unit gives an R-squared of <N/> against DEQ's published <N/> ..." Name the regression and do not count.

### B9. The 17q12-21 gap callout overstates the record
- **Location:** §6.3 callout "How to read a zero in that row" (p. 26).
- **Quoted:** "No study has looked there in a South Asian discovery sample, so the record is silent, and silence is not evidence of absence."
- **Rule:** task 9 (17q12-21 gap framing); no uncited claims. The count is of genome-wide-significant associations. Asthma studies with South Asian discovery samples exist in the same extract (87,128 individuals, Table 9), and a GWAS tests the whole genome, so such studies did "look there". The record shows no declared association, not an absence of study. An epidemiologist would challenge this first.
- **Fix:** "No study in this release declared a genome-wide-significant association at this locus from a South Asian discovery sample; South Asian samples are 0.18 percent of the discovery total, so the record has little power to show one, and a zero here is not evidence of absence." Bind both numbers through `<N>`.

---

## Should fix

### Numbers and display (task 1)

S1. **Hand-typed numbers remain in prose.** D32 and CONTEXT §8 say "Report prose types no number". All of the following render from literal text, not from `<N>` or `<EditionDate>`:
- **Dates and digit values:**
  - §1: "2026-08-10".
  - §2: "2026-08-10", "2026-08-09", "2026-10-18", "2026-10-25".
  - §3.3 and §5.3: "18 of 24".
  - §3.3 and §5.2: "2026-08-19".
  - §5.2 callout: "2026-10-22" (twice), "2026-11-04", "2026-10-18".
  - §5.3: "2026-03-10", "23 valid hours".
  - §5.4: "whole days through 2026-08-07".
  - §7.2: "2026-08-10", "2026-08-09".
  - §7.3: "8-hour", "1-hour".
  - §8: "2026-03-03", "2026-05-14", "2026-11-04", "2026-09-17 and 2026-10-22", "March 2027", "May 2027", "October 2027".
  - §6.4: "2023 release", "September 2024".
  - §7.1: "as revised in 2024".
  - Appendix A.2: "2026-10-25", "CPython 3.14", "Node 20".
  - Appendix C: "98 percent", "18 of 24", "07:00".
- **Counts in words:**
  - §2: "twenty-six inputs", "nine hours".
  - §3.1: "seven-stage", "Four gates".
  - §5.1: "Three ... three", "Four of the nine".
  - §5.2: "two significant figures".
  - §5.4: "one to two microgram", "five of the six", "a fifth of a microgram", "nine rows".
  - §5.5: "fifteen pairs".
  - §5.6: "near two", "up to ten", "roughly thirty micrograms".
  - §7.2: "a factor of three", "three seasons".
  - §7.3: "Nine hours".
  - Appendix B: "twelve" (twice).
- **Captions and alt text (`figures.json`, `tables.json`):**
  - F01 alt: "12", "2026-06-18 to 2026-08-07".
  - F02 caption: "2026-08-07 07:00 EST".
  - F02 alt: "0.725 and 0.837, against 0.497 and 0.207".
  - F03 alt: "119", "118", "0.0017".
  - F03 caption: "23 valid hours".
  - F04 caption: "51-day", "152 days".
  - F04 alt: "51 days", "152", "5 of six".
  - F05 alt: "0.886 and 0.966".
  - F06 alt: "88.61".
  - T03 caption: "2026-08-07 07:00 EST".
  - T06 caption: "nine rows".
  - T11 caption: "5e-08", "five".
  - Sources C/D notes: "2026-10-22", "2026-11-04".
- **Fix:** bind each to an existing key (e.g. `daily.*` window, `network.record_days.*`, `freeze.*`, `smoke.*`) or to a new key (`freeze.taken_at`, `daily.mismatch_date`, `daily.mismatch_valid_hours`, `foia.record_end`, `deq.correction_date`, `network.loudoun_sites`, `corr.n_pairs`, `ratio.median`). Generate captions and alt text from keys. If spelled-out structural counts ("four kinds of reader") are allowed, rule that explicitly.

S2. **Printed precision differs from the key without a D48 ruling:**
- Figure 6 bar and legend labels print 88.6 %, 7.3 %, 52.7 %, 21.8 % against 2-decimal keys, and Native Hawaiian prints 0.1 % against 0.05 in Table 11.
- The edition cutoff renders "2026-08-07T07:00 EST" in prose but "2026-08-07 07:00 EST" in F02/T03 captions and the Table 6 source line.
- Counts print without thousands separators in Tables 3, 7 and 13 ("2745", "3495") against "2,745" in prose.
- **Fix:** add a display-format ruling for figure labels and one cutoff format, and apply the prose number format to table counts.

S3. **§5.4 rise range against Table 6.** "between 2.069 and 2.514". Differencing the printed Table 6 values gives 2.070 for DC-01 (39.167 − 37.097). The key is computed unrounded, which is correct, but a reader will report a mismatch. **Fix:** add a Table 6 column "Clock minus standard (µg/m³)" from the same unrounded values, or note that the range is computed before rounding.

### DEQ comparisons, R1–R4 (task 4, 8)

S4. **Sentences comparing GENARCH and DEQ that do not name the edition cutoff:**
- Summary R3 sentence (p. 2): "On the window when all six sensors were collecting, 5 of the 6 exceed ... ranks fourth".
- §5.4 first paragraph (p. 16): "Restricted to the window ... ranks fourth under both".
- §5.2 first paragraph (p. 11): "Recomputing them ... agree with DEQ's within 0.05 ...".
- **Rule:** CONTEXT §4 R3 day-set convention and D20 ("Every sentence comparing GENARCH and DEQ values names DEQ_EDITION_CUTOFF").
- **Fix:** add "on whole days through 2026-08-07 (DEQ's edition cutoff <N k="deq.edition_cutoff"/>)" to each.

S5. **Summary R3 carries only half of caveat 2.**
- **Quoted (p. 2):** "...ranks fourth — which is a statement about unequal record length and season and not about any site being polluted..."
- **Rule:** D19 requires that DEQ's table be described as correct for each sensor's own record, and that the paragraph state this is not a claim DEQ's figures were wrong. §5.4 does this, but the summary does not.
- **Fix:** "DEQ's table reported each sensor's value over its own record; the comparison between sensors did not hold because the records differed in length and season. This is not a claim that DEQ's figures were wrong or that any site is polluted."

S6. **§5.1 record days attributed to the wrong cutoff.**
- **Quoted:** "through DEQ's 2026-08-07 edition, site DC-01 carries 152 complete days and site DC-06 carries 51".
- **Problem:** the keys' window is "whole days through 2026-08-07". Under DEQ's edition cutoff the counts are 151 and 50 (`network.record_days.*.deq_cutoff`).
- **Fix:** "on whole days through 2026-08-07, site DC-01 carries ... (151 and 50 under DEQ's edition cutoff)".

S7. **§5.4 understates the zero-handling effect.**
- **Quoted:** "Zero handling is a secondary effect and is inconsistent in direction, closing one site and opening another."
- **Problem:** Table 5, clock-time columns, zeros missing against zeros kept: DC-02 moves +0.019 → −0.180 and DC-04 moves −0.002 → −0.312 (two sites opened). DC-05 moves +0.155 → −0.005 (one closed), and DC-08 narrows +0.200 → +0.081.
- **Fix:** "closing one site and opening two".

S8. **§7.2 contradicts §5.2 and Table 3.**
- **Quoted:** "DEQ's corrected coefficients for one regression were computed over a window that runs past this report's cutoff, and that comparison cannot be aligned from this side at all."
- **Problem:** Table 3's APEX 5 NO2 DEQ column is presented as the corrected coefficients on the report's own window.
- **Fix:** after B7, reword to: "DEQ's printed correction (2026-08-21 edition) covers a longer window than the regulatory record this report holds, so it is not compared."

S9. **§5.5 misdescribes the hour count, and the correlation window is never stated.**
- **Quoted:** "correlates between 0.886 and 0.966 across all fifteen pairs ... over 3,619 hours outside the smoke window".
- **Problem:** `corr.n_hours` is "distinct hours carrying a valid reading at one or more of the six sensors". The pairs use 1,139–3,495 hours (Table 7). The window, "full record of the original analysis inputs" (exports to 2026-08-10), appears nowhere in the summary, §5.5 or Figure 5.
- **Fix:** "...across all fifteen pairs, each over 1,139 to 3,495 overlapping hours (3,619 distinct hours in all) from the original analysis inputs, through 2026-08-10, smoke window excluded".

S10. **APEX 14 PM2.5 pairs start 2026-03-08 22:00, and no reason is given.**
- **Location:** Table 3 period start for APEX 14 PM2.5. APEX 14 NO2 starts 2026-03-03 00:00, and Table 13 shows the regulatory PM2.5 monitor with 24 valid hours from 2026-03-03.
- **Problem:** five days of PM2.5 pairs are missing without explanation. A DEQ analyst will ask whether DEQ's 1.3 + 0.83x fit includes them.
- **Fix:** state the cause (sensor-side exclusions, duplicates or zeros) in a table note, with a key for the excluded count.

S11. **The daily reconciliation has an unexplained 31-day gap.**
- **Location:** Table 13 (pp. 37–41). Rows jump from 2026-06-15 to 2026-07-17. 2026-07-16 is the first smoke day.
- **Problem:** other gaps (03-12/13, 05-07–05-10, 05-21/22, 06-04/05) are also unexplained. 119 comparable days out of 160 calendar days needs a breakdown.
- **Fix:** add a T04s column or note with the excluded days by reason (published null or `<`, recomputed below 18/24, absent from file), backed by keys.

S12. **Smoke handling against GENARCH_RULES §6.**
- **Location:** Figure 1, Figure 4, Summary C3 figure, §3.5.
- **Problem:** GENARCH_RULES §6 requires three things at the point of display for the July 16–19 window: the IF Canadian-fire qualifier (present in Figure 1), that a single day above 35 is not an exceedance (present only in the limitation text), and that exceptional-event determination rests with EPA and is unresolved. The EPA point appears nowhere in the report. §6 also says "Every summary statistic is reported twice, with and without the smoke window". The 99.11 percent share and the common-window p98s are reported with the smoke window only.
- **Fix:** add the EPA sentence to §3.5 and the Figure 1 in-figure label. Either report the C3 share and the common-window p98 without the smoke window as well, or record a ruling that the §6 rule is waived for those statistics and why.

### Site names, codes and scope (task 6)

S13. **Prince William sites named outside §1 and §5.1.**
- **Location:** §5.2 "After the freeze" callout ("records no closure at sites DC-04, DC-10, DC-11 or DC-12"); Table 12 [T01] rows DC-10, DC-11 and DC-12 with their export SHA-256s (Appendix A); Table 2 prints PW record-day counts (23, 22, 23).
- **Rule:** D5 ("named only in §1 (scope) and §5.1 (network), with no values").
- **Fix:** drop DC-10, DC-11 and DC-12 from the callout sentence. Either record a D5 exception for the provenance manifest or collapse the three PW rows into one "outside v1 scope" row. Rule on whether record days count as a value; if so, print "outside scope" in Table 2.

S14. **The site key disagrees with DEQ's in-freeze edition.**
- **Location:** Table 2 [T02] (p. 11).
- **End dates:** DEQ's 2026-10-09 edition, section 2, says Newberry ended **May 14** (site key: 2026-05-15). It says 1757 Golf Course, Farmwell MS and Sterling MS ended **September 17** (site key: 2026-09-18 for DC-09, DC-08 and DC-06). It says the PW sensors were moved on September 17 (site key starts: 09-16, 09-17, 09-18).
- **APEX units:** the same edition names sensor 8 at Heritage Farm, sensor 10 at Farmwell and sensor 13 at 1757 Golf Course. The site key prints "not confirmed" for DC-07, DC-08 and DC-09.
- **Names:** DEQ's editions say "1757 Golf Course", but the site key's "DEQ published name" is "1757 Golf Club" (the dashboard label).
- **Fix:** state the site key's date convention (exclusive end? dashboard occupancy?) in a note. Fill the three units from the 2026-10-09 edition with a citation. Say which DEQ publication the name column follows.

S15. **Paired-site analysis is described two incompatible ways.**
- **Summary callout:** "The paired-site analysis of the two units that shared a location is not included."
- **§8:** "One unit occupied two sites over the record".
- **Problem:** CONTEXT §7 defines it as the apex-06 analysis, one unit at two sites (DC-05, then DC-06). The summary has it backwards.
- **Fix:** summary: "The paired-site analysis of the one unit that occupied two Loudoun sites is not included."

S16. **"Across 2026" and "12 sites" should be bounded by the data cutoff.**
- **Location:** §5.1 "Across 2026 it covered 12 sites"; F01 alt "A timeline of 12 sensor sites across 2026"; F01 alt "the shortest begins in mid-June". In fact DC-10 to DC-12 begin in mid-September.
- **Problem:** DEQ's post-freeze editions add Discovery ES (Loudoun, 2026-11-04), PW Police Dept West and Meadows Farms (PW, 2026-10-22).
- **Fix:** "Through the 2026-10-10 data cutoff it covered 12 sites". Correct the alt text to "the shortest Loudoun record begins in mid-June".

### Post-freeze material (task 10)

S17. **Roadmap "Scope of the second county" carries an unlabelled, uncited post-freeze date.**
- **Quoted (p. 32):** "DEQ's network now includes sites in Prince William County, deployed on 2026-09-17 and 2026-10-22."
- **Problem:** 2026-10-22 is after the freeze, and the sentence has no citation. The 2026-09-17 date also conflicts with Table 2's 09-16/09-17/09-18 starts (S14).
- **Fix:** "...deployed on 2026-09-17 and, after the freeze, on 2026-10-22 (DEQ's <EditionDate id="deq2026oct30"/> edition <Cite id="deq2026oct30"/>)".

S18. **"The collocation site closed": the regulatory monitor did not close.**
- **Location:** §5.2 callout "Site DC-01, the collocation site, then closed on 2026-11-04"; §8 "The collocation site closed on 2026-11-04 [D]".
- **Problem:** the 2026-11-06 edition, section 2, says "data collection at Broad Run HS (sensor 8) ended. Sensor 8 was moved to Discovery Elementary School". Section 4 still tabulates the "Broad Run HS Regulatory Monitor".
- **Fix:** "Sensor collection at site DC-01 ended on 2026-11-04 and the unit moved to a new Loudoun site; the regulatory monitor continues." Label the §8 "Collocation series status" item as after the freeze, as the May 2027 item is.

S19. **The "After the freeze" callout omits the additions to the network.**
- **Quoted:** "...so a reader comparing this report against a current DEQ edition knows why ... the network looks different".
- **Problem:** the 2026-10-30 and 2026-11-06 editions record two new PW sites (2026-10-22) and a new Loudoun site (2026-11-04), and the callout mentions none of them.
- **Fix:** add one sentence, cited to [C] and [D], noting the additions without codes or values. This is also needed to keep "no closure at sites DC-04..." from reading as "no change".

S20. **Every post-freeze date is otherwise verified** (2026-10-22 APEX 5→8 swap and DC-02 closure, recorded in the 2026-10-30 edition, section 2; 2026-11-04 DC-01 sensor end, recorded in the 2026-11-06 edition, section 2; no closure at DC-04 in the 2026-11-06 edition). No post-freeze fact appears in §7.3. The open point is that §7.3, item 4, says "it is reported to DEQ as such": no record in AUDIT.md shows the DEQ preview email (D15, item 4) was sent. **Fix:** confirm that it was sent and cite the date, or change to "will be reported to DEQ".

### References and sources (task 7)

S21. **The Sources entries for DEQ editions fail the title and stable-URL requirements.**
- **Titles:** every ingested edition is titled "Data Center Air Quality Analysis". Entry B says "Data Center Air Monitoring Project weekly report, page 2", C and D say "...weekly report", and A appends "Table 4" to the title.
- **URLs:** A–D all point at the project landing page, which carries only the current edition. That is not a stable address for a 2026-08-07 or 2026-10-09 edition. Table 12 uses a different URL again (`showpublisheddocument/39287`) for both the 2026-08-07 and the 2026-10-09 rows, and one document ID cannot be two editions.
- **Resolution:** both DEQ hosts returned HTTP 403 to a generic automated client on 2026-11-15, so resolution could not be confirmed.
- **Fix:** use the document title "Data Center Air Quality Analysis" with the edition date. Give each edition a per-edition address (the document ID DEQ served that week, or an archived copy). Check the URLs manually in a browser.

S22. **PEC URL does not resolve to the cited work.** `https://www.pecva.org/work/energy/data-centers/` redirects to a blog post, "data-centers-and-gas-demand-make-boring-pipelines-great-again". The entry's edition date is year-only ("2026"). **Fix:** cite the assessment's own page and publication date.

S23. **Other source fields.**
- ACS [J] edition date "2024" is the survey year, not the release date of the 2020–2024 5-year estimates.
- GENARCH [M] title differs from the live site's title ("GENARCH — Genetic Epidemiology Atlas").
- The Diversity Monitor "September 2024 snapshot" is cited to Mills 2020 [7], the paper that introduced the dashboard, not the snapshot.
- **Fix:** give the ACS release date. Match M's title or drop the entry (B6). Add a source entry for the dashboard snapshot with a retrieval date.

S24. **Source J points at the wrong table.**
- **Quoted (p. 47):** "The county composition in Table 12 and the lower panel of Figure 6."
- **Problem:** the ACS table is Table 11. Table 12 is Frozen inputs.
- **Rule:** D47 (no typed table numbers).
- **Fix:** render the note's table reference through `<TableRef id="T12"/>`, or drop the number.

S25. **Citations that do not support the sentence they sit on.**
- **§5.7:** "...the disease link as association evidence from genome-wide studies [12][13]". [13] (MacIntyre 2014, GSTP1/TNF and air pollution) is not about IL-33.
- **§5.7:** "[10][11][14]" for a human airway chain. [10] is an NF-κB/miR-331 cell study, [11] is a mouse study (GENARCH_RULES §8 already flags `10.1111/cei.12348` as "a mouse PM10 study ... misattributed across four repo files"), and [14] is the bad DOI (B4).
- **§6.3:** "Increasing the diversity of discovery samples is the only measure that addresses it [6][5]". Kachuri et al. [5] review cross-ancestry transfer methods, which are other measures.
- **Fix:** match each citation to its claim. Say that [10] and [11] are cell and animal evidence. Change "the only measure" to "the measure the cited reviews give most weight".

### Required statements and wording (task 9, 12, 14)

S26. **The summary omits section 6.**
- **Quoted:** "It does two things."
- **Problem:** the summary never states the ancestry-composition result (88.61 percent European, the 17q12-21 gap), which is one of the four items the changelog says this version establishes.
- **Rule:** task 8 (summary against sections 5 and 6).
- **Fix:** add two sentences with `<N>` keys and the not-a-headcount qualifier.

S27. **Lead sentence invites a headcount reading.**
- **Quoted (§6.2):** "the initial-stage discovery samples total 49,391,706 individuals".
- **Problem:** a reporter will quote "49 million individuals". The callout corrects this, but only after the figure is stated.
- **Fix:** "the initial-stage discovery samples sum to 49,391,706 (a total of study sample sizes, not of distinct people)".

S28. **Table 11 [T12] caption carries the wrong caveat.** "These are counts of people enrolled and associations declared, not effect estimates". Table 11 is ACS residents. **Fix:** remove that sentence from the T12 caption.

S29. **The "Reference method monitor" glossary entry is wrong for this monitor.**
- **Quoted:** "An instrument designated under federal regulation ... The regulatory monitor in this network is one".
- **Problem:** the Broad Run T640X is a Federal **Equivalent** Method (GENARCH_RULES §2 and §6, method 638).
- **Fix:** retitle the entry "Federal reference or equivalent method monitor" and say that the regulatory monitor is FEM.

S30. **§5.6 says "tested" but shows no test.**
- **Quoted:** "Four readings of this record were tested and are not supported by it."
- **Problem:** no key, table or method supports X2–X4. The median ratio of 1.82 and the "up to 10" are hand-typed in words.
- **Fix:** add keys and a one-line method per hypothesis, or say "were examined in the August analysis (method in the project audit)".

S31. **Mechanism chain provenance.**
- **Evidence classes:** Table 8 [T09] steps 2–3 use the class "functional", which is not in the atlas EvidenceType enum (GWAS, eQTL, pathway, literature, inferred). A reader cannot look it up.
- **Step 5:** "Type 2 inflammation → Asthma exacerbation" takes its class from `il33.json linked_diseases[asthma]` (an IL33–asthma GWAS association). That is evidence for a gene–disease link, not for this step.
- **Fix:** define "functional" in the glossary or map it to an enum class. Say in §3.6 that the step 1 and step 5 classes come from gene-level links that the figure attaches to those steps.

S32. **Community module scope.** Table 1 counts 2 community regions; inventory inputs are `data/community/fairfax-county-va.json` and `loudoun-county-va.json`. §7.4 says "one county boundary and one county-level value per exposure layer", and §1 says the atlas "covers one county". **Fix:** state that the atlas carries a Fairfax County comparison region and why, and correct §7.4. Check the Fairfax region against CLAUDE.md constraint 4 (Loudoun focus).

S33. **Undisclosed meaning of "export date".**
- **Location:** Table 12 [T01], "Export date 2026-10-11T13:47:03-04:00" on all twelve freeze exports.
- **Problem:** this is the commit time of `782c1dc` (the ingest commit), which D10 uses as an upper bound on the export date. It is not a recorded export time.
- **Fix:** add a table note: "Upper bound: the time the export was committed; the dashboard records no export time" (D10).

S34. **"Every input" is overstated.**
- **Quoted:** §2 "Every input the analysis reads is listed in Appendix A"; Table 12 caption "Every file the report's analysis reads".
- **Problem:** Table 12 omits the GWAS Catalog extracts, the ACS files, the ontology term list, the atlas inputs and the three frozen config inputs, all of which FREEZE.json pins.
- **Fix:** list them, or say "Every DEQ and sensor input; the atlas, ancestry and configuration inputs are pinned in FREEZE.json under atlas_inputs, ancestry_inputs and config_inputs."

S35. **Appendix B is inconsistent with the body.**
- **Quoted:** "Two tables appear here rather than in the body." Table 7 [T07] is printed in full on p. 21 **and** on p. 41 under the same number.
- **Quoted:** "Reprinting all twelve" / "All twelve are published together as a CSV archive". There are 13 tables, and `GENARCH_Annual_Report_2026_v1.0_tables.zip` holds 13 CSVs.
- **Fix:** print Table 7 once (keep the §5.5 copy and drop it from B, or the reverse) and correct the text to thirteen. Numbering 1–13 in first-appearance order otherwise matches D47, and every table's source line names its archive file.

S36. **Appendix A.1 describes three commands but lists six.** "The first command ...; the second ...; the third rebuilds the site". **Fix:** describe all six, or group them.

S37. **X9 risk on the 2026-08-19 correction.**
- **Quoted (§3.3):** "DEQ confirmed in correspondence of 2026-08-19". **(§5.2):** "a correction DEQ issued on 2026-08-19 ... traced its earlier figures to axis limits".
- **Problem:** this states the content of private correspondence with this project about a DEQ revision, which reads as DEQ revising its table because of GENARCH (X9).
- **Fix:** cite the correction to the 2026-08-21 edition (see B7). Describe the zero-retention point as "DEQ staff confirmed (2026-08-19)" without saying who asked, or move it to Methods without the revision narrative.

S38. **Summary characterises the record.**
- **Quoted:** "Against that standard, the record is mostly unremarkable".
- **Problem:** this is an evaluative headline about DEQ's data that a reporter will quote, and it sits next to 11 site-days at or above 35 µg/m³ (1,220 of 1,231 below).
- **Rule:** C4 (neutral) and the prose rules.
- **Fix:** "Against that level, 99.11 percent of ... sit below 35 µg/m³ through the 2026-10-10 data cutoff". This also fixes the unstated cutoff for this count (task 8).

S39. **Figure 4 labels collide.** The DC-01 stem runs through the "35 µg/m³: level of the 24-h standard; not comparable (see §7)" annotation. The DC-06 own-record dot is hidden under its common-window square ("51 d 51 d"), so the site the argument turns on has only one visible marker. **Fix:** move the reference-line label to the right margin, and offset or outline coincident markers.

---

## Minor

M1. **§3.2 describes the superseded two-step DST shift** ("shifted back by one hour before the spring transition and by two hours after it") without the 2026-11-08 America/New_York amendment (D35). It is harmless for this record, which ends before the fall-back. **Fix:** add a clause.

M2. **Figure 3 carries the sensor limitation**, but it plots only the regulatory monitor. **Fix:** give F03 a regulatory-data note instead, or rule that the box goes on every DEQ figure.

M3. **Uncited correspondence facts:**
- §3.3: "confirmed by agency staff" (18/24).
- §3.4: "which is DEQ's own plotting convention".
- Glossary "Edition cutoff": "07:00 on the Friday" (DEQ staff, 2026-08-16).
- §2 and §7.2: "A follow-up request ... is pending" (no request number or date).
- **Fix:** add a correspondence source entry, or cite the edition text where DEQ states it.

M4. **Prose rules (CONTEXT §8):**
- §3.2: "reconciling them is the single most consequential methodological step in this report" (significance inflation).
- §5.1: "The records differ enormously in length".
- §1: "so the count of sites is honest".
- §3.6: "Stating this is not a formality."
- §5.2: "The four are not four instances of one thing." / "That is the right way to describe the set".
- §5.5: "This is descriptive and nothing more."
- Glossary: "the single easiest way to get every result in this report wrong".
- Repeated "no X, no Y and no Z" triplets (§1 ×2, §2, §7.1).
- §6.4 four-way list "in trait scope, in stage, in provenance and in the category framework".
- The em-dash count is within limit (one, in the summary).

M5. **"This is the first annual report of GENARCH"** (summary, first sentence). X6 bans "any 'first' claim". This is an ordinal about the report's own series, not a novelty claim, but the rule as written catches it. **Fix:** "This is GENARCH's 2026 annual report", or record an exemption.

M6. **The DEQ correction is described in Table 3's period and status columns without saying what "Period start/end" means** (first and last paired hour). Meanwhile Table 2 shows the APEX 14→5 change on 2026-04-08, and Table 3 shows it at 2026-04-07 21:00/22:00 EST. **Fix:** rename the columns "First paired hour (EST)" / "Last paired hour (EST)" and add a note linking them to the §3.4 unit-assignment rule.

M7. **Layout:**
- Reference URLs break mid-token ("htt ps://", "http s://", p. 45).
- Table 8 source cells break identifiers mid-token ("linked_ex posures", "evidenc e_type", "(si te/src").
- Tables 3 and 10 headers hyphenate heavily ("Com-par-i-son", "Afri-can Amer-ican or Afro-Car-ibbe-an").
- Table 10's "Locus" column repeats the cytoband.
- Figure 1's APEX labels and rotated reference-line labels are very small.
- Table 9 [T10] prints with no caption, unlike every other table.
- No text is clipped or outside the measure, and no cell is empty without a stated reason ("n/a", "open at freeze", "see DP05", "no single-category rows", "not applicable" each carry one).
- **Fix:** add `overflow-wrap: anywhere` for URLs and code cells, allow wider columns or landscape pages for Tables 3 and 10, and enlarge the Figure 1 annotation font.

M8. **"NR" and "Other"** in Tables 9 and 10 are undefined. **Fix:** add "NR = not reported" to the table note.

M9. **The T10 caption in `tables.json` names an internal path** ("tabulated in docs/report-2026/AUDIT.md"). §6.4 says "tabulated in the project audit". Neither is reachable by a reader. **Fix:** drop the pointer or publish the comparison.

M10. **Recommended citation format.** "Kiaan Saraiya. (2026)." is not APA. **Fix:** "Saraiya, K. (2026)." in `apaCitation()`.

M11. **`inventory.json` key value** `inventory.graph.status` reads "live; not reproducible from current pipeline (D25)". It is not rendered (Table 1 and T08 drop it), but it is a decision ID in a published-data value. **Fix:** strip "(D25)" from the value and keep it in `method`.

M12. **"No association between tract-level exposure and tract-level prevalence is reported"** (summary callout) names both measures without the ecological-fallacy sentence. Nothing in the report pairs them, and §7.5 carries the disclosure (C6 otherwise passes). **Fix:** add "(see section 7.5)".

M13. **Spelling** mixes British forms ("licence", "modelled", "analysed", "neighbouring", "standardises") with US ones ("normalize", "License" on the cover). **Fix:** pick one.

---

## Checked and passing

- Every `<N>` value in the prose equals its key. All keys resolve, including the inventory and chain keys in `inventory.json` and `chain.json`. Table cells match their CSVs, and prose restatements of table values (Table 5 differences, Table 6 ranks, 1,231 = sum of the Loudoun record days, Table 9 total, Table 11 total) are arithmetically consistent.
- The DEQ limitation text matches `DEQ_REPORT_LIMITATION` and the 2026-10-09 edition p. 2 word for word. It is attributed in the F01–F05 captions and absent from Figure 6.
- R3 caveats 1 and 2 (per D19) are in the same paragraph as R3 in §5.4. R4 is stated as descriptive everywhere. The R1 classification wording matches GENARCH_RULES §9 apart from B7/B8.
- Freeze dates: data freeze 2026-10-18, data cutoff 2026-10-10 23:00:00, atlas freeze 2026-11-02, ancestry inputs 2026-11-03. Each is consistent wherever stated. The freeze commit `c2101b3…` and its rewritten identifier `782c1dc…` match FREEZE.json, AUDIT.md's rewrite map and git in both §2 and A.2.
- GWAS release 2026-11-02 and ACS 2024 are consistent throughout. The ACS 2024 vs 2023 note and the Diversity Monitor vs catalog note are present. Chain steps 2–4 are assigned by figure definition in §3.6, §5.7, §7.4 and Table 8. No brief title is printed.
- Roadmap: D39–D46 are each reflected, with the graph item first. No KIAAN marker and no decision or rule ID appears in the PDF, TSX, CSVs, `figures.json` or `tables.json`.
- No DEQ school name appears outside Table 2. No site slug, site_id or school name appears in the PDF text, CSV headers, SVG figures or alt text. No Prince William site carries a concentration value.
- C1, C2, C4, C5/D29, C6, C10 and X1–X8: no violation found beyond those listed above. X1–X4 appear only in §5.6, each with a reason.

---

## Count

| Severity | Count |
|---|---|
| Blocking | 9 |
| Should fix | 39 |
| Minor | 13 |
| **Total** | **61** |
