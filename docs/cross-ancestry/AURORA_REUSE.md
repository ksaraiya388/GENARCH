# AURORA reuse record — cross-ancestry layer

Written 2026-10-06, during the GENARCH cross-ancestry work package.

**Conclusion: there was nothing to reuse.** AURORA's literature-audit files exist but are
empty. GENARCH's cross-ancestry bibliography was therefore built from scratch, from Crossref
and Europe PMC, and none of it is derived from AURORA.

AURORA was treated as read-only throughout. Nothing was written, committed, or run inside it.

---

## 1. Inventory

AURORA lives in WSL2 at `~/AURORA` and was reachable.

| | |
|---|---|
| Commit | `24e2b7d` — "Initial commit: AURORA repo structure through Month 2 Week 1" |
| Inventory command | `find . -maxdepth 4 \( -iname '*.bib' -o -iname '*refer*' -o -iname '*lit*' -o -iname '*reading*' -o -iname '*notes*' -o -iname '*.md' \) -not -path './.git/*'` |

The inventory returned 48 paths. All but five were `NEWS.md` files inside vendored R packages
under `lib/`, which are third-party changelogs and carry no literature.

## 2. Files read

Every candidate source of PRS-portability reading, with its size as read at commit `24e2b7d`:

| Path | Bytes | Content |
|---|---|---|
| `00_literature_audit/literature_notes.md` | 0 | empty |
| `00_literature_audit/prior_work_table.md` | 0 | empty |
| `00_literature_audit/novelty_verification_log.md` | 0 | empty |
| `CLAUDE.md` | 0 | empty |
| `08_validation/portability_beta_correlation.R` | 107 | `# PLACEHOLDER — portability_beta_correlation.R` plus a creation-date comment. No code. |
| `data/gwas/data_provenance.txt` | 1452 | GWAS download and harmonisation log (Bentham 2015 SLE, Yin 2021) |
| `data/provenance.txt` | 329 | 1000 Genomes Phase 3 and gnomAD v3.1.2 AFR download log |

The three `00_literature_audit/` files are dated 14 March 2026 and are zero-length: the
directory was scaffolded and never filled.

## 3. Papers AURORA already covers, by DOI

**None.** A DOI scan across the whole repository, excluding `.git/` and the vendored `lib/`
tree, returned zero matches:

```
grep -rIoE "10\.[0-9]{4,9}/[^ ]+" . --exclude-dir=.git --exclude-dir=lib | wc -l
0
```

So the "papers already covered by AURORA / new papers added" split for this work package is
**0 already covered / 19 added**.

## 4. Definitions GENARCH reuses

**None from AURORA.** AURORA defines no portability index: the file that would hold one
(`08_validation/portability_beta_correlation.R`) is a placeholder.

The one definition GENARCH needed — relative accuracy — is therefore cited to its original
paper, which is where it belongs regardless:

> **Relative accuracy (RA)** of a polygenic score in an ancestry-divergent target population
> is the ratio of prediction accuracy in that population to prediction accuracy in a
> population of the same ancestry as the discovery sample: `RA = R²₂ / R²₁`.
>
> **Loss of accuracy (LOA)** is `(1 − RA) × 100%`.
>
> Wang Y et al., *Theoretical and empirical quantification of the accuracy of polygenic
> scores in ancestry divergent populations*, Nature Communications 2020,
> [10.1038/s41467-020-17719-y](https://doi.org/10.1038/s41467-020-17719-y). Definition at
> Results, text following Equation (1); LOA at Results, section on the fraction of RA
> attributable to MAF and LD differences.

Recorded in `pipeline/sources/cross_ancestry/literature.json` as `wang2020ra-definition` and
`wang2020ra-loa-definition`, with the verbatim locator excerpts.

## 5. What AURORA is actually working on

Worth recording so a future reader does not expect overlap that is not there. AURORA's
provenance logs show systemic lupus erythematosus GWAS (Bentham 2015, `GCST003156`; Yin 2021,
`GCST011093`) harmonised to hg38, with 1000 Genomes Phase 3 and gnomAD v3.1.2 African-ancestry
allele frequencies as reference panels. That is an African-ancestry SLE pipeline. It does not
intersect the traits in this work package (type 2 diabetes, coronary artery disease, asthma).

## 6. Standing rule

GENARCH never presents AURORA's unpublished results as findings. AURORA contributes reading
and definitions only — and in this work package it contributed neither, so the question did
not arise. If AURORA later fills `00_literature_audit/`, the shared record is
`pipeline/sources/cross_ancestry/literature.json`, exported for import as
`docs/cross-ancestry/cross_ancestry.bib`. GENARCH does not copy that file into AURORA.

## 7. Module scope decision: why three modules, not four

Recorded here because the deciding evidence is bibliographic.

Three modules shipped: `type-2-diabetes`, `coronary-artery-disease`, `asthma`. The optional
fourth was evaluated and **excluded**.

- **Hypertension.** The candidate source is Kurniansyah et al. 2023
  ([10.1038/s41467-023-38990-9](https://doi.org/10.1038/s41467-023-38990-9), verified). Its
  groups are defined by *self-reported race/ethnic background* — "Asian, Black,
  Hispanic/Latino, and White" — and its "Asian" group is not a South Asian-ancestry grouping.
  Using it for a South Asian-ancestry transferability metric would mean equating a
  census-style self-identification category with a genetic-ancestry group, which the
  population-descriptor policy forbids. Wang Y et al. 2020 does report hypertension among its
  eight traits, but its South Asian RA reduction was not statistically significant for
  hypertension, so there is no South Asian transferability metric to report.
- **Breast cancer.** Europe PMC searches for a breast-cancer PRS transferability or
  portability metric in a South Asian-ancestry cohort returned no study meeting the threshold.

Neither meets "at least one verified study reporting a quantitative transferability metric for
South Asian ancestry". Three modules ship rather than a fourth padded one.
