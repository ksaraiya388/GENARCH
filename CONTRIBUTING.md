# Contributing

Corrections are welcome. If a number here is wrong, I would rather hear it than not.

The fastest path is an issue naming the specific number and the file it came from. That is
enough to act on. A pull request is welcome too but not required, and please open the issue
either way so the correction is visible.

## Reporting a data error

Open an issue with:

1. The number as published, and where it appears (page URL, or file and line).
2. What you believe it should be.
3. Where your value comes from.

If the number traces to a DEQ source, `pipeline/sources/manifest.json` and
`docs/DATA_PROVENANCE.md` name the raw file it was derived from. Quoting that file path saves
a round trip.

Most published figures are computed at build time rather than typed, so a data error usually
means either the source table is wrong or the derivation is. Say which one you think it is if
you know; guessing is fine.

Some values are transcribed by hand from DEQ PDFs, including the weekly edition comparison in
`DEQ_WEEKLY_EDITIONS`. Those are the ones most likely to carry a typo. The PDFs are archived
under `docs/deq-reports/` so you can check them directly.

## Reporting a methodological error

Open an issue describing the step you think is wrong and what it should be instead. Useful
things to point at:

- A processing decision in `pipeline/reshape_deq.py` (timestamp normalization, the exact-zero
  handling, the exclusion rules, the 18-of-24 completeness rule).
- A statistical choice in `site/src/lib/deq-data.ts` (the regression fit, the percentile
  definition, the common-window comparison).
- A claim in `docs/METHODS.md` that does not match what the code does.

Disagreements about method are more useful than they are annoying. If you think a comparison
is not valid, say so and say why. If a limitation is missing from the page, that is a
methodological error and I want to hear about it.

## What will not be accepted

A few constraints are fixed and are documented in `CLAUDE.md` and `docs/CONTENT_CONSTRAINTS.md`:

- No individual risk language. Everything is population-level.
- No personal data intake of any kind: no accounts, no uploads, no genotype files.
- No uncited scientific claims.
- Neutral language in the community module.

Contributions that would cross one of these will be declined regardless of technical merit.

## Before opening a pull request

Run the four checks CI runs:

```bash
python -m pipeline validate
ruff check pipeline/
cd site && npx tsc --noEmit
cd site && npm run build
```

The build asserts the DEQ collocation reproduction and several content constraints, so a
passing build carries real information about whether the analysis still holds.
