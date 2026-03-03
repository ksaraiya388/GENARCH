# GENARCH v1.0 Definition of Done

## 1) Requirement mapping (PRD → implementation)

| PRD requirement | Implementation |
|---|---|
| Educational-only, no medical advice | `site/components/layout/DisclaimerBanner.tsx`, `site/components/common/EvidenceLimitations.tsx`, `site/components/passport/PassportDocument.tsx` |
| No accounts/login/user storage | No auth dependencies; stateless routes only (`site/app/passport/*`) |
| No genomic uploads | No upload components/endpoints implemented |
| Atlas disease/exposure/gene/pathway pages | `site/app/atlas/*` dynamic routes |
| Mechanism briefs index + detail | `site/app/mechanism-briefs/*`, `site/content/briefs/*.mdx` |
| Graph page with filters and side panels | `site/app/graph/page.tsx`, `site/components/graph/GraphExplorer.tsx` |
| Graph export PNG/SVG/JSON | `GraphExplorer.tsx` export handlers |
| Community index + region page + model explanations | `site/app/community/*`, `site/components/community/*` |
| Methods/transparency pages | `site/app/methods/*`, `METHODS.md`, `MODEL_CARD.md`, `ETHICS.md` |
| Updates + report pages + PDF download | `site/app/updates/*`, `site/app/api/reports/[year]/pdf/route.ts`, `pipeline/report.py` |
| Passport form + result/download state | `site/app/passport/page.tsx`, `site/app/passport/pdf/page.tsx`, `site/components/passport/*` |
| Strict schema validation with build blocking | `pipeline/models.py`, `pipeline/validate.py`, root `site:build` script |
| Required pipeline commands | `pipeline/update.py`, `pipeline/validate.py`, `pipeline/report.py` |
| Seed entities (asthma, air pollution, IL33, NF-kB, brief, graph, community) | `pipeline/sources/seed.json` and emitted `data/*` |
| Backend architecture artifacts (Postgres + Neo4j) | `docs/postgres_schema.sql`, `docs/neo4j_model.cypher` |
| GraphQL + REST API design | `site/api-server/index.ts` |

## 2) Routes list (App Flow coverage)

Implemented routes:

- `/` (Home)
- `/atlas`
- `/atlas/diseases`
- `/atlas/exposures`
- `/atlas/genes-pathways`
- `/atlas/diseases/[slug]`
- `/atlas/exposures/[slug]`
- `/atlas/genes/[slug]`
- `/atlas/pathways/[slug]`
- `/mechanism-briefs`
- `/mechanism-briefs/[slug]`
- `/graph`
- `/community`
- `/community/[region]`
- `/methods`
- `/methods/ethics`
- `/methods/model-card`
- `/updates`
- `/updates/[slug]`
- `/reports/[year]` (alias to updates)
- `/passport`
- `/passport/pdf`

API routes:

- `/api/search`
- `/api/passport`
- `/api/reports/[year]/pdf`
- `/api/community/[region]/exposures`
- `/api/healthstats/[region]`

Express/Apollo backend:

- `/api/graphql`
- `/search`
- `/passport`
- `/reports/:year/pdf`
- `/community/:regionSlug/exposures`
- `/healthstats/:regionSlug`

## 3) Security checklist

| Control | Status | Implementation |
|---|---|---|
| Strict input validation | ✅ | Zod schemas in all public route handlers + Express endpoints |
| Input sanitization | ✅ | `site/lib/security.ts` and `sanitizeObject()` in Express API |
| Reject unexpected fields | ✅ | `.strict()` schemas |
| Rate limiting all public endpoints | ✅ | Next in-memory limiter + Express `express-rate-limit` (Redis-ready) |
| Graceful 429 responses | ✅ | `tooManyRequestsResponse` and Express limiter handler |
| Secure key handling | ✅ | `site/.env.example`, `site/lib/env.ts`, server-only env parsing |
| CORS restriction | ✅ | Express `cors` origin allowlist; Next middleware API headers |
| Security headers | ✅ | Express `helmet`, Next middleware hardening headers |
| Stateless passport behavior | ✅ | URL and client-side generation only; no DB writes; no cookies required |

