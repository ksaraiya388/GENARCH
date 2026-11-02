# Brief titles: risk, treatment, diagnosis and individual-level language

Audit for DECISIONS.md D8. Every brief title, question field and rendered heading was read
against CONTEXT.md C5 ("Population-level only. No individual risk, no diagnosis, no clinical
language") and `docs/CONTENT_CONSTRAINTS.md` section 5 ("No individual risk language").

**Nothing in this file is applied.** The table is a proposal. Slugs stay unchanged in every
row, so no URL moves and no cross-link breaks.

Scope read: 10 brief records under `data/briefs/`, the orphan MDX under `content/briefs/`, and
the seven section headings in `site/src/app/mechanism-briefs/[slug]/page.tsx`.

A note on the rule citation. The prompt cites "master spec hard rule 7"; that document is not
in the repo, so each row cites the repo rule that states the same thing — CONTEXT.md C5,
CONTENT_CONSTRAINTS.md section 5, and `CLAUDE.md` critical constraint 1. `VERIFICATION.md`
section 5 records the same rule as "No individual risk scores". If the master spec's numbering
matters for the record, it needs to be added to a row by hand.

---

## Proposed rewrites

| file | field | current | proposed | rule |
|---|---|---|---|---|
| `data/briefs/asthma-air-pollution-17q21.json` | `title` | 17q21 genotype and PM2.5: how ORMDL3 and GSDMB regulation shifts **asthma risk** under air pollution exposure | 17q21 genotype and PM2.5: how ORMDL3 and GSDMB regulation shifts the **population-level asthma association** under air pollution exposure | C5 — bare "risk" with no population qualifier |
| `data/briefs/asthma-air-pollution-17q21.json` | `question` | Why does the same PM2.5 exposure level associate with different **asthma risk in carriers** of 17q21 risk haplotypes? | Why does the same PM2.5 exposure level associate with different **population-level asthma rates among carriers** of 17q21 risk haplotypes? | §5 — "risk" with a group of people as subject. "17q21 risk haplotypes" is kept: §5 permits a genetic subject |
| `data/briefs/bdnf-stress-major-depressive-disorder.json` | `question` | How does the BDNF Val66Met polymorphism interact with psychosocial stress to **influence risk of** major depressive disorder and neural plasticity? | How does the BDNF Val66Met polymorphism interact with psychosocial stress to **shift the reported population-level association with** major depressive disorder and neural plasticity? | C5 — bare "risk"; also removes "influence", which asserts a direction of effect (§1) |
| `data/briefs/jak-stat-psoriasis-ibd-environment.json` | `title` | JAK-STAT and IL-23/Th17 Pathway in Psoriasis and IBD: Environmental Triggers and **Therapeutic Targets** | JAK-STAT and IL-23/Th17 Pathway in Psoriasis and IBD: Environmental Modifiers and **Pathway Nodes** | C5 — treatment language. "Environmental Triggers" is changed in the same string because `environmental triggers` is already a banned phrase in `scripts/check-constraints.mjs` |
| `data/briefs/leptin-melanocortin-obesity-environment.json` | `question` | How do genes in the leptin–melanocortin pathway (LEP, LEPR, MC4R, FTO) interact with diet and physical activity to **influence obesity risk**? | How do genes in the leptin–melanocortin pathway (LEP, LEPR, MC4R, FTO) interact with diet and physical activity to **modify the population-level association with obesity**? | C5 — bare "risk" |
| `data/briefs/pm25-il33-nfkb-asthma.json` | `title` | PM2.5 Exposure Amplifies IL-33-Mediated Airway Inflammation via NF-kB Signaling in Genetically Susceptible **Individuals** | PM2.5 Exposure Amplifies IL-33-Mediated Airway Inflammation via NF-κB Signaling in Genetically Susceptible **Populations** | C5 and §5 — individual-level language, people as the subject. "Amplifies" is kept: it is the `Direction` enum value `amplify`. `NF-kB` is also corrected to `NF-κB` to match the `question` field |
| `data/briefs/pm25-il33-nfkb-asthma.json` | `question` | How does ambient PM2.5 exposure interact with genetic variation in IL33 and NF-κB pathway genes to amplify airway inflammation and **asthma risk**? | How does ambient PM2.5 exposure interact with genetic variation in IL33 and NF-κB pathway genes to amplify airway inflammation and the **population-level asthma association**? | C5 — bare "risk" |
| `data/briefs/pparg-diet-type2diabetes.json` | `question` | How does the PPARG Pro12Ala polymorphism interact with diet quality to **influence** insulin sensitivity and **type 2 diabetes risk**? | How does the PPARG Pro12Ala polymorphism interact with diet quality to **modify** insulin sensitivity and the **population-level association with type 2 diabetes**? | C5 — bare "risk"; "influence" asserts a direction of effect (§1) |
| `data/briefs/sleep-deprivation-metabolic-mental-health.json` | `question` | How do sleep deprivation and circadian disruption interact with genetic susceptibility to **affect metabolic disease and depression risk**? | How do sleep deprivation and circadian disruption interact with genetic susceptibility to **modify the population-level association with metabolic disease and depression**? | C5 — bare "risk"; "affect" asserts a direction of effect (§1) |
| `content/briefs/asthma-air-pollution-ormdl3.mdx` | `title` (frontmatter) | How Air Pollution Amplifies **Asthma Risk in ORMDL3 Variant Carriers** | How Air Pollution Amplifies the **Population-Level Asthma Association in ORMDL3 Variant Carriers** | §5 — "risk" with a group of people as subject |
| `content/briefs/asthma-air-pollution-ormdl3.mdx` | `question` (frontmatter) | How does PM2.5 exposure amplify **asthma risk** through the 17q21 locus and IL33 signaling? | How does PM2.5 exposure amplify the **population-level asthma association** through the 17q21 locus and IL33 signaling? | C5 — bare "risk" |

Eleven rewrites across nine files. The MDX is the orphan D9 covers: no route reads
`content/briefs/`, so those two rows change nothing a reader sees. They are listed because the
file is a brief and the rule is not conditional on the file being wired up. If D9 resolves by
moving it to `docs/archive/briefs/`, strike both rows instead of applying them.

---

## Read and found clean

No change proposed, with the reason.

| file | field | current | why it passes |
|---|---|---|---|
| `bdnf-stress-major-depressive-disorder.json` | `title` | BDNF Val66Met and Psychosocial Stress in Major Depressive Disorder Susceptibility | "Susceptibility" is not risk language and takes no human subject |
| `jak-stat-psoriasis-ibd-environment.json` | `question` | How do environmental factors interact with the JAK-STAT and IL-23/Th17 pathway in psoriasis and inflammatory bowel disease? | No risk, treatment, diagnosis or individual-level term |
| `leptin-melanocortin-obesity-environment.json` | `title` | Leptin–Melanocortin Axis and Obesogenic Environment in Polygenic Obesity | Anatomical and environmental subjects only |
| `no2-traffic-corridor-childhood-asthma.json` | `title` | Traffic-Related Nitrogen Dioxide Along the Route 28–Dulles Corridor and Childhood Asthma | Describes the corridor and the outcome, asserts no relation |
| `no2-traffic-corridor-childhood-asthma.json` | `question` | How does chronic near-roadway exposure … modify the incidence and exacerbation of childhood asthma **at the population level**, particularly among carriers of 17q21 (ORMDL3, GSDMB) and IL33/TSLP susceptibility variants? | Already says "at the population level" and uses "modify". This is the form the other questions are being rewritten toward |
| `oxidative-stress-air-pollution-asthma-cvd.json` | `title` | Oxidative Stress Response Genes (GSTP1, SOD2) and Air Pollution in Asthma and Cardiovascular Susceptibility | "Susceptibility", genetic and environmental subjects |
| `oxidative-stress-air-pollution-asthma-cvd.json` | `question` | How do genetic variants … **modify the association between** air pollution exposure and asthma or cardiovascular disease? | "modify the association between" is the preferred form in CONTENT_CONSTRAINTS section 1 |
| `pparg-diet-type2diabetes.json` | `title` | PPARG Pro12Ala and Diet Quality in Type 2 Diabetes and Insulin Sensitivity | Names the variant, the exposure and the outcome without asserting a relation |
| `sleep-deprivation-metabolic-mental-health.json` | `title` | Sleep Deprivation and Circadian Disruption in Metabolic and Mental Health: Gene–Environment Interactions | No risk, treatment, diagnosis or individual-level term |
| `site/src/app/mechanism-briefs/[slug]/page.tsx` | 7 section headings | Central Question, Background, Evidence Summary, Mechanistic Chain, Tissue Specificity, Counterarguments / Limitations, Validation Criteria | Every rendered heading in the brief template is neutral. None needs a rewrite |

---

## Two rows that need your ruling rather than a rewrite

**1. `t2d-south-asian-prs-transferability.json`, `title` and `question`: "polygenic risk score".**

> Why European-ancestry GWAS underserve Loudoun's South Asian community: PRS transferability in
> type 2 diabetes
>
> How well do type 2 diabetes polygenic risk scores derived mainly from European-ancestry GWAS
> carry over to South Asian-ancestry populations, and which measurable quantities account for
> the shortfall?

A polygenic risk score is an individual-level predictor by construction, and the question
spells the term out. Three reasons not to propose a rewrite:

- The subject is the instrument, not a person or a group. §5 permits that reading, the same way
  it permits "high-risk allele".
- "polygenic risk score" is the published name of the method. Renaming it in a brief whose
  whole subject is how well the method transfers would make the brief harder to check against
  the literature it cites, which is the reasoning CONTENT_CONSTRAINTS section 8 applies to
  paper titles.
- The question is explicitly about populations and about transferability as a measurable
  property, not about any person's score.

If you read C5 as covering the term itself, the rewrite is "PRS" in the title and "polygenic
scores" in the question, and `/ancestry-equity` needs the same pass. That is a bigger change
than D8 describes, so it is raised here rather than assumed.

**2. Three "bare risk" rewrites change what the sentence claims, not just how it reads.**

The `bdnf`, `pparg` and `sleep-deprivation` questions currently ask how an exposure
"influences" or "affects" a risk. The proposals above replace that with "modify the reported
population-level association". That is a weaker claim, and it is the claim the briefs' own
`background` and `counterarguments` sections support. If you want the question field to keep
the stronger verb, the rows need different wording and the body text should be re-read for the
same problem.

---

## What the lint does not catch

Worth recording, because it explains why none of the eleven rows above appears in
`docs/lint-baseline.json` and why D8 is an editorial gate rather than a failing check.

1. **The `question` field is never linted.** `JSON_DISPLAY_KEYS` in
   `scripts/check-constraints.mjs` does not list `question`, and the comment on
   `JSON_DISPLAY_LIST_KEYS` states the consequence: "A prose key absent from this list is NEVER
   linted." Seven of the eleven rows are `question` fields. `title` **is** linted outside
   `references[]`, so the title rows are inside the lint's reach; the terms just are not.
2. **No clinical term is in the lexicon at all.** There is no `therap`, `treatment`, `diagnos`,
   `medication` or `clinical` pattern in `scripts/check-constraints.mjs`, so C5's ban on
   clinical language is unenforced. "Therapeutic Targets" has been shipping in a published
   brief title and in the page `<h1>`.
3. **The person-subject patterns are three fixed strings:** `high risk`, `predisposed`,
   `at risk`. "Asthma Risk in ORMDL3 Variant Carriers" and "Genetically Susceptible
   Individuals" match none of them. `individuals` is in the lexicon only as a
   `POPULATION_NOUNS` entry that escalates `triggers`.

Closing 1 and 2 is a small change to `scripts/check-constraints.mjs` and would turn D8 into a
check that holds. It would also newly flag text in files this pass does not rewrite, so it
needs its own baseline decision. Not proposed here; flagged for a later prompt.
