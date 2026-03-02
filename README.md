# GENARCH
GENARCH (Genetic Epidemiology Network for At-Risk Community Health) is a next-generation scientific web atlas that links:

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
python3 -m pip install -e ./pipeline
```

> Note: `npm install` at repo root runs `postinstall`, which installs `site/` dependencies automatically.
> If postinstall scripts are disabled, run `npm --prefix site install` manually.

### 2) Generate seed data + report

```bash
python3 -m pipeline.update --scope all
python3 -m pipeline.report --year 2026
python3 -m pipeline.validate
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

Canonical commands from the PRD:

```bash
npm run site:dev
npm run site:build
python -m pipeline.update --scope all
python -m pipeline.update --scope disease --id asthma
python -m pipeline.validate
python -m pipeline.report --year 2026
```

If your machine does not have `python` aliased, use `python3` for the same commands:

```bash
python3 -m pipeline.update --scope all
python3 -m pipeline.update --scope disease --id asthma
python3 -m pipeline.validate
python3 -m pipeline.report --year 2026
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
