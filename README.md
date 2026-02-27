# GENARCH

GENARCH (Global Exposome; Genetic Epidemiology Network for At-Risk Community Health) is an educational, read-only scientific atlas linking:

- environmental exposures
- genetic architecture
- molecular pathways and tissues
- community-level public health context

> **Educational only; not medical advice.**
> GENARCH does not provide individual risk scores, diagnosis, or treatment recommendations.

---

## Repository structure

```text
site/        # Next.js TypeScript web app
pipeline/    # Python ETL + strict schema validation + report generation
data/        # generated canonical artifacts
docs/        # DB models + implementation checklists
scripts/     # convenience scripts
PRD.md
METHODS.md
MODEL_CARD.md
ETHICS.md
```

---

## Quick start (local)

### 1) Install dependencies

```bash
npm install
npm --prefix site install
python -m pip install -e ./pipeline
```

### 2) Generate seed data + report

```bash
python -m pipeline.update --scope all
python -m pipeline.report --year 2026
python -m pipeline.validate
```

### 3) Run site

```bash
npm run site:dev
```

Open `http://localhost:3000`.

---

## Docker compose (infrastructure services)

Start PostgreSQL, Neo4j, and Redis:

```bash
docker compose up -d
```

Stop services:

```bash
docker compose down
```

---

## Required commands (repo root)

All required commands are wired from root:

```bash
npm run site:dev
npm run site:build
python -m pipeline.update --scope all
python -m pipeline.update --scope disease --id asthma
python -m pipeline.validate
python -m pipeline.report --year 2026
```

---

## API surfaces

### Next route handlers

- `GET /api/search?q=...`
- `POST /api/passport`
- `GET /api/reports/:year/pdf`
- `GET /api/community/:region/exposures`
- `GET /api/healthstats/:region`

### Express + Apollo server

In `site/api-server/index.ts`:

- GraphQL: `POST /api/graphql`
- REST: `/search`, `/passport`, `/reports/:year/pdf`, `/community/:regionSlug/exposures`, `/healthstats/:regionSlug`

Start local API server:

```bash
npm --prefix site run api:dev
```

---

## Security controls

- strict schema validation and sanitization on endpoint inputs
- rate limiting on public endpoints (Redis-ready; memory fallback)
- secure env-based key handling (`site/.env.example`)
- hardened headers via `helmet` (Express) and Next middleware
- no personal data persistence in passport flow

---

## CI

`.github/workflows/ci.yml` enforces:

1. pipeline lint/type checks
2. `python -m pipeline.validate`
3. `npm run site:build`
