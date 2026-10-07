# Post kit: Ancestry & Equity

Factual source material for the owner to write posts from. **This file contains no posts.**
No threads, no hooks, no calls to action, no suggested wording for an opening line. Every
claim below is a standalone sentence that already appears on the live site, with its source
and DOI attached.

Generated 2026-10-06 alongside the cross-ancestry layer.

---

## 1. Canonical URLs

Trailing slashes are required: `next.config.js` sets `trailingSlash: true`, so a link without
one redirects.

| Page | URL |
|---|---|
| Landing page | `https://genarch.org/ancestry-equity/` |
| Type 2 diabetes module | `https://genarch.org/atlas/diseases/type-2-diabetes/#cross-ancestry` |
| Coronary artery disease module | `https://genarch.org/atlas/diseases/coronary-artery-disease/#cross-ancestry` |
| Asthma module | `https://genarch.org/atlas/diseases/asthma/#cross-ancestry` |
| Mechanism brief #5 | `https://genarch.org/mechanism-briefs/t2d-south-asian-prs-transferability/` |

## 2. Figure files

Exported by `npm run figures:export`. Both sizes are 2x. Card is 1200x675 for X and LinkedIn
link previews; square is 1080x1080 for Instagram and Reddit thumbnails.

### prs-portability

- `site/public/figures/prs-portability-card@2x.png`
- `site/public/figures/prs-portability-square@2x.png`

Alt text, verbatim:

> A bar chart of incremental AUC for one multi-ancestry type 2 diabetes polygenic risk score across five ancestry groups, from a single study: European 0.143, Admixed American 0.086, East Asian 0.074, South Asian 0.061, and African or African American 0.041. All five bars are the same metric, the same trait, and the same score, so they are directly comparable. Incremental AUC is the gain in area under the curve from adding the score to a model of age, sex and principal components.

### gwas-ancestry-imbalance

- `site/public/figures/gwas-ancestry-imbalance-card@2x.png`
- `site/public/figures/gwas-ancestry-imbalance-square@2x.png`

Alt text, verbatim:

> A bar chart of GWAS participant share by ancestry group from a single September 2024 snapshot. European ancestry is 94.48 percent and Asian ancestry is 3.96 percent. The snapshot itemises only these two groups and does not break out South Asian ancestry separately, so 'Asian' here is not South Asian-specific. The remaining share is not itemised in this snapshot and is not plotted.

## 3. Postable claims

Eight standalone sentences, each 280 characters or fewer, each on the live site, each naming
its metric wherever a number appears. Character counts are of the claim only, excluding the
source line.

**1.** (200 chars)
> In one multi-ancestry type 2 diabetes polygenic score, incremental AUC was 0.143 in European-ancestry validation cohorts and 0.061 in South Asian-ancestry cohorts. Same score, same metric, same study.

Source: Huerta-Chagoya et al. 2026, The Lancet Diabetes & Endocrinology. doi:10.1016/s2213-8587(25)00405-x

**2.** (210 chars)
> Asthma polygenic score accuracy, as variance explained on the liability scale: 0.054 in the European-ancestry target cohort, 0.053 East Asian, 0.038 Central and South Asian, 0.014 African. One study, one score.

Source: Tsuo et al. 2022, Cell Genomics. doi:10.1016/j.xgen.2022.100212

**3.** (232 chars)
> A 2018 coronary artery disease polygenic score kept 0.97 of its European-ancestry effect size in South Asian ancestry, and 0.23 in African ancestry. Metric: relative effect size for incident disease, indexed to European performance.

Source: Patel et al. 2023, Nature Medicine. doi:10.1038/s41591-023-02429-x

**4.** (167 chars)
> South Asian-ancestry participants were 0.8% of GWAS participants in a 2022 survey of the field. European descent accounted for 86.3%, and Hispanic or Latino for 0.08%.

Source: Fatumo et al. 2022, Nature Medicine. doi:10.1038/s41591-021-01672-4

**5.** (190 chars)
> Averaged across traits, allele-frequency and linkage-disequilibrium differences explain about 86% of the loss of relative accuracy in African ancestry, and about 37% in South Asian ancestry.

Source: Wang et al. 2020, Nature Communications. doi:10.1038/s41467-020-17719-y

**6.** (213 chars)
> In the DIAMANTE type 2 diabetes meta-analysis, the ancestry-specific South Asian genetic risk score explained under 1% of trait variance on the pseudo R-squared scale, and a European-derived score outperformed it.

Source: Mahajan et al. 2022, Nature Genetics. doi:10.1038/s41588-022-01058-3

**7.** (224 chars)
> A newer score is not automatically better for every group. One multi-ancestry type 2 diabetes score did not significantly beat the best previously published score in South Asian ancestry: incremental AUC 0.061 against 0.068.

Source: Huerta-Chagoya et al. 2026, The Lancet Diabetes & Endocrinology. doi:10.1016/s2213-8587(25)00405-x

**8.** (184 chars)
> The multi-ancestry asthma analysis evaluated no admixed American, Hispanic or Latino target cohort. For that trait and those groups there is no transferability figure to report at all.

Source: Tsuo et al. 2022, Cell Genomics. doi:10.1016/j.xgen.2022.100212

### Loudoun population figures, for context alongside any of the above

These are Census self-identification categories, not genetic-ancestry groups. Never put one of
these counts in the same sentence as an ancestry-group metric without saying so.

- Loudoun County population, 2023 ACS 5-year estimates: 427,082. No margin of error is published.
- Asian alone: 89,864, which is 21.0% of the county. Margins of error 1,389 and 0.2 percentage points.
- Asian Indian: 45,468, margin of error 2,243. Pakistani: 9,848, margin 1,694. Nepalese: 1,800, margin 637.
- Black or African American alone: 32,889, which is 7.7%. Margins 815 and 0.2 points.
- Hispanic or Latino of any race: 60,466, which is 14.2%. No margin of error is published for either figure.
- The Sri Lankan count, 334, has a margin of error of 445, larger than the estimate. Do not quote it as a firm count.

Source: US Census Bureau, American Community Survey 2023 5-year estimates, tables DP05 and B02015, Loudoun County, Virginia (state 51, county 107). Retrieved 2026-10-06.

## 4. Cited researchers

First and last author of every verified reference behind these pages. **No social handles are
listed, because none were looked up and guessing one would attribute a claim to the wrong
person.** Find them yourself before tagging anyone.

| First author | Last author | Paper | DOI |
|---|---|---|---|
| Alicia Huerta-Chagoya | Alan B. Zonderman | Multi-ancestry polygenic risk scores for the prediction of type 2 diabetes and complications in diverse ancestries | 10.1016/s2213-8587(25)00405-x |
| Anubha Mahajan | Andrew P. Morris | Multi-ancestry genetic study of type 2 diabetes highlights the power of diverse populations for discovery and translation | 10.1038/s41588-022-01058-3 |
| Tian Ge | Elizabeth W. Karlson | Development and validation of a trans-ancestry polygenic risk score for type 2 diabetes in diverse populations | 10.1186/s13073-022-01074-2 |
| Sam Hodgson | Sarah Finer | Genetic basis of early onset and progression of type 2 diabetes in South Asians | 10.1038/s41591-024-03317-8 |
| Carla Márquez-Luna | Alkes L. Price | Multiethnic polygenic risk scores improve risk prediction in diverse populations | 10.1002/gepi.22083 |
| Aniruddh P. Patel | Amit V. Khera | A multi-ancestry polygenic risk score improves risk prediction for coronary artery disease | 10.1038/s41591-023-02429-x |
| Minxian Wang | Amit V. Khera | Validation of a Genome-Wide Polygenic Score for Coronary Artery Disease in South Asians | 10.1016/j.jacc.2020.06.024 |
| Kristin Tsuo | Alicia R. Martin | Multi-ancestry meta-analysis of asthma identifies novel associations and highlights the value of increased power and diversity | 10.1016/j.xgen.2022.100212 |
| Ying Wang | Loic Yengo | Theoretical and empirical quantification of the accuracy of polygenic scores in ancestry divergent populations | 10.1038/s41467-020-17719-y |
| Yi Ding | Bogdan Pasaniuc | Polygenic scoring accuracy varies across the genetic ancestry continuum | 10.1038/s41586-023-06079-4 |
| Florian Privé | Bjarni J. Vilhjálmsson | Portability of 245 polygenic scores when derived from the UK Biobank and applied to 9 ancestry groups from the same cohort | 10.1016/j.ajhg.2021.11.008 |
| Alicia R. Martin | Mark J. Daly | Clinical use of current polygenic risk scores may exacerbate health disparities | 10.1038/s41588-019-0379-x |
| L. Duncan | B. Domingue | Analysis of polygenic risk score usage and performance in diverse human populations | 10.1038/s41467-019-11112-0 |
| Linda Kachuri | Tian Ge | Principles and methods for transferring polygenic risk scores across global populations | 10.1038/s41576-023-00637-2 |
| Segun Fatumo | Karoline Kuchenbaecker | A roadmap to increase diversity in genomic studies | 10.1038/s41591-021-01672-4 |
| Nuzulul Kurniansyah | Tamar Sofer | Evaluating the use of blood pressure polygenic risk scores across race/ethnic background groups | 10.1038/s41467-023-38990-9 |
| Sarah Finer | David A van Heel | Cohort Profile: East London Genes & Health (ELGH), a community-based population genomics and health study in British Bangladeshi and British Pakistani people | 10.1093/ije/dyz174 |
| Melinda C. Mills | Charles Rahal | The GWAS Diversity Monitor tracks diversity by disease in real time | 10.1038/s41588-020-0580-y |
| National Academies of Sciences, Engineering, and Medicine | — | Using Population Descriptors in Genetics and Genomics Research | 10.17226/26902 |

Note: Mahajan 2022 has 355 listed authors, Huerta-Chagoya 2026 has 260, and Hodgson 2024 has
77. First and last author are the conventional credit for consortium papers, but neither
stands in for the consortium. Name the consortium where there is room: DIAMANTE for Mahajan,
Genes & Health for Hodgson, the Global Biobank Meta-analysis Initiative for Tsuo.

## 5. Do not say

Each line is a claim the evidence does not support. These are the specific overreaches this
material invites.

- **"Polygenic scores don't work for South Asians."** They are less accurate, by a measured
  amount, on a named metric. Incremental AUC 0.061 against 0.143 is a gap, not a zero. For
  coronary artery disease the 2018 score kept 0.97 of its European-ancestry effect size.
- **Anything implying a Loudoun resident's own chance of disease.** Every figure is a
  group-level statistic from a published study population. None of these studies measured
  anyone in Loudoun County, and none of them describes an individual anywhere.
- **Comparing numbers across studies or metrics.** Incremental AUC, variance explained on the
  liability scale, odds ratio per standard deviation, pseudo R-squared and relative effect
  size are different quantities on different scales. 0.061 and 0.038 are not two points on one
  trend. Never place two of them in one sentence as a comparison.
- **"GENARCH found" or "GENARCH's analysis shows."** GENARCH ran no polygenic scoring, no
  reanalysis and no new study. It synthesises published work and has no finding of its own.
  Write "GENARCH collects" or "published studies report."
- **Equating a Census category with an ancestry group.** "21% of Loudoun is Asian, and
  polygenic scores are worse for Asian ancestry" fuses a self-identification category with a
  genetic-ancestry grouping in one sentence. They are different constructs measured different
  ways. If both appear, the difference has to appear with them.
- **Treating "South Asian" as one population.** The reference meta-analysis separates Sri
  Lankan, Bangladeshi and South Indian study populations from North Indian and Pakistani ones.
  The asthma cohort is "Central and South Asian" combined and is not South Asian-specific.
- **Any statement about whether polygenic scores should or should not be used in clinical
  care.** GENARCH reports what studies measured and takes no clinical position.
- **Naming the GWAS Diversity Monitor's "Asian" share as a South Asian figure.** That snapshot
  does not break out South Asian ancestry. The 0.8% figure comes from a different source with
  a different denominator and the two must not be mixed.

## 6. One-paragraph description

For bios and link previews. 265 characters.

> GENARCH's Ancestry & Equity layer collects what published studies measured about polygenic
> score accuracy across ancestry groups for type 2 diabetes, coronary artery disease and
> asthma, set beside Loudoun County's population. Population-level only. Not a risk tool.
