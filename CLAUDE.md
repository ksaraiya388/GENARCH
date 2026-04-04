# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GENARCH is a read-only scientific web atlas mapping gene-environment interactions for Loudoun County, Virginia. Monorepo with a Python data pipeline (`pipeline/`) and a Next.js 14 static site (`site/`).

## Commands

```bash
# Site development
npm run site:dev              # Start Next.js dev server (port 3000)
npm run site:build            # Copy data + build static export
npm run site:lint             # ESLint

# Pipeline
python -m pipeline validate                          # Validate all data schemas, cross-links, citations, graph integrity
python -m pipeline update --scope all                 # Run full ETL pipeline
python -m pipeline update --scope disease --id asthma # Update single entity
python -m pipeline report --year 2026                 # Generate annual report

# CI checks (run before pushing)
python -m pipeline validate
ruff check pipeline/
cd site && npx tsc --noEmit
cd site && npm run build
```

## Architecture

### Data Flow

```
pipeline/sources/*.tsv,json  →  pipeline (ingest→normalize→annotate→score→emit→validate)  →  data/*.json
                                                                                                    ↓
site/scripts/copy-data.js copies data/ → site/_data/ at build time
                                                                                                    ↓
site/src/lib/data.ts reads JSON files synchronously (getAllDiseases(), getGene(slug), etc.)
                                                                                                    ↓
Next.js App Router pages consume data at build time → static HTML export (site/out/)
```

The site is fully static (`output: "export"` in `next.config.js`). No runtime API. Data resolves from `_data/` (Vercel/CI) or `../data/` (local dev).

### Data Schemas

TypeScript types in `site/src/lib/types.ts` must mirror Pydantic models in `pipeline/schemas.py`. Both use strict validation (Pydantic: `extra="forbid"`). Core entities: Disease, Exposure, Gene, Pathway, GraphData, CommunityRegion, MechanismBrief.

Key enums shared across both: Direction (`amplify | buffer | unknown`), Confidence (`low | medium | high`), EvidenceType (`GWAS | eQTL | pathway | literature | inferred`).

### Validation

`pipeline/validate.py` enforces: Pydantic schema conformance, cross-link integrity (every `exposure_slug` in a disease must resolve to `data/exposures/`), citation ID existence, slug-filename consistency, graph edge-node integrity, and disease completeness (must have loci, tissues, exposure modifiers, population equity notes).

### Site Structure

Root layout (`site/src/app/layout.tsx`) renders DisclaimerBanner → Navigation → children → Footer → Vercel Analytics. All components are exported via `site/src/components/index.ts`.

Pages use `generateStaticParams` for dynamic routes (`[slug]`). Charts use Recharts (client components). Knowledge graph uses Cytoscape.js. Community maps use react-leaflet. Search uses Fuse.js client-side.

### Design Tokens (Tailwind)

- **Backgrounds**: navy-deep `#0B1F2F`, navy-mid `#132B3C`, navy-light `#1A3A4F`
- **Primary**: teal-primary `#2DD4BF`, teal-soft `#1FAFA0`
- **Text**: surface-white `#F8FAFC`, cool-light `#C7D2DA`, cool-mid `#94A3B8`
- **Direction modifiers**: amplify `#C53030` (red), buffer `#2F855A` (green), unknown `#A0AEC0` (gray)
- **Typography**: text-h1, text-h2, text-h3 utility classes; Inter sans, Fira Code mono

## Critical Constraints

**These are non-negotiable and must never be violated:**

1. **No individual risk language.** All visualizations are population-level. Never use "you are at risk," "high risk," "predisposed" about individuals. Disclaimers on every scientific page: "Educational only. Not medical advice. Not a diagnostic tool."
2. **No personal data intake.** No accounts, logins, VCF uploads, genotype files, or user storage of any kind.
3. **No Passport feature.** The Passport concept is permanently removed. Do not re-add any page that generates personalized outputs or individualized summaries.
4. **Loudoun County focus.** GENARCH is hyperlocal. Do not use "global" framing. The subtitle is "A Gene-Environment Interaction Atlas for Loudoun County, Virginia."
5. **No uncited claims.** Every scientific claim must be traceable to a reference. Use CitationRenderer for inline refs.
6. **Cross-ancestry caveats** wherever Eurocentric GWAS data is primary. The `population_equity` field in Disease tracks ancestry representation.
7. **Community module: neutral language only.** Use "higher modeled burden," "elevated exposure levels" — never "diseased," "unhealthy."

## Deployment

Vercel deploys automatically from `main` via GitHub integration. The site is a static export — no server-side runtime. CI runs on push to `main` or PRs (`.github/workflows/ci.yml`).
