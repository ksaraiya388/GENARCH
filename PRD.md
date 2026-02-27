# GENARCH PRD (Implementation Snapshot)

This repository implements GENARCH v1.0 as an educational, read-only atlas.

## Product constraints

- Educational only; not medical advice
- No logins/accounts
- No user profile storage
- No personal genomic upload
- No individual risk scoring or clinical recommendations
- Passport generation is stateless

## Modules included

1. Atlas core (disease, exposure, gene, pathway pages)
2. Mechanism briefs (MDX)
3. Knowledge graph with filtering and export
4. Population-level risk-shift visualization
5. Community module with map + SHAP-like driver panel
6. Methods and transparency pages
7. Updates and annual report pages
8. Educational passport PDF workflow

## Architecture

- Site: Next.js + TypeScript + Tailwind + Recharts + Cytoscape + Leaflet
- Pipeline: Python 3.11 + Pydantic strict schemas
- API: Express + Apollo GraphQL + validated REST endpoints
- Data contracts: canonical JSON in `/data/*`

## Required commands

- `npm run site:dev`
- `npm run site:build`
- `python -m pipeline.update --scope all`
- `python -m pipeline.update --scope disease --id asthma`
- `python -m pipeline.validate`
- `python -m pipeline.report --year 2026`
