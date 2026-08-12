# Data provenance

> This file currently holds only the standing note below. The full per-source provenance
> table — one row per entry in `pipeline/sources/manifest.json`, generated programmatically
> so it cannot drift — is produced in Phase 7 of the publication work package.

## Standing note: quoting comparisons in external communication

**Any external communication that quotes a comparison must quote all available tiers.**

Where the atlas holds a region value alongside more than one comparator, quoting a subset is
technically true and presentationally selective. The Loudoun asthma figures are the worked
example:

| Measure | Region | State | National | 95% CI |
|---|---|---|---|---|
| Asthma hospitalization rate (per 10,000, 2023) | 4.2 | 5.1 | 4.9 | [3.5, 5.0] |
| Asthma prevalence (percent, 2023) | 8.2 | 9.4 | 8.0 | — |

Quoting only the state comparison would report that Loudoun sits below the state on both
measures. It does — but on prevalence it also sits **above** the national figure, and on
hospitalization the confidence interval `[3.5, 5.0]` **overlaps the national value of 4.9**,
so those two point estimates are not distinguishable at this precision.

This applies to press enquiries, social copy, slide decks, grant text, and any figure exported
from the site.

**Enforcement.** This is not left to editorial discipline:

- `CommunityRegionDetail.tsx` builds every comparison tier present in the data as one array
  and maps over it, so a tier cannot be dropped by editing a single branch.
- `assertComparisonCompleteness()` throws at build time if the number of tiers that would
  render differs from the number the data carries, or if a confidence interval is
  half-specified.
- Where a region value sits below one comparator and above another, a neutral summary
  sentence naming **both** relationships is generated from the data, never hand-written.
- Where a confidence interval overlaps a comparator, the overlap is stated inline.
- `scripts/check-constraints.mjs` fails the build if a component renders a region and state
  value while a national value exists in the source data and is not rendered, or renders a
  statistic while an available confidence interval is not rendered.
