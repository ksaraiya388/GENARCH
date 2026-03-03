# GENARCH

**GENARCH** (Genetic Epidemiology Network for At-Risk Community Health) is a next-generation scientific web atlas designed to close one of the most persistent gaps in modern biology: the disconnect between genetic architecture and environmental exposure science.

The atlas integrates genetic epidemiology, pathway biology, and community-level environmental data to support public understanding and informed action. It does **not** provide individual risk scores or clinical advice.

---

## Project Description

GENARCH combines:

- **Atlas**: Curated diseases, exposures, genes, and pathways with evidence scoring and cross-references
- **Graph**: Interactive knowledge graph of entity relationships
- **Community**: County/census-tract-level hotspot model and exposure layers for environmental justice context
- **Passport**: User-generated summary document (stateless, no accounts)
- **Mechanism Briefs**: Narrative explanations of gene–environment mechanisms
- **Reports**: Annual GENARCH reports

---

## Setup

### Local Development

**Prerequisites**: Python 3.11+, Node.js 20+, npm

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd genarch
   ```

2. **Install pipeline dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install site dependencies**
   ```bash
   cd site && npm ci
   cd ..
   ```

### Docker Compose

A `docker-compose.yml` can be used for containerized development. Run:

```bash
docker compose up --build
```

(Add `docker-compose.yml` as needed for your environment.)

---

## Required Commands

| Command | Description |
|---------|-------------|
| `npm run site:dev` | Start Next.js development server |
| `npm run site:build` | Build static site for production |
| `npm run site:lint` | Lint the site with ESLint |
| `python -m pipeline validate` | Validate pipeline schemas and cross-links |
| `python -m pipeline update` | Run full pipeline (ingest → normalize → annotate → score → emit → validate) |
| `python -m pipeline report --year 2026` | Generate annual report |

---

## Directory Structure

```
genarch/
├── data/                 # Emitted JSON (diseases, exposures, genes, pathways, graph, community)
├── docs/                 # Documentation (METHODS, ETHICS, MODEL_CARD, PRD)
├── pipeline/             # Python pipeline
│   ├── sources/          # Source TSV/JSON for ingest
│   ├── ingest.py         # Stage 1: Ingest
│   ├── normalize.py      # Stage 2: Normalize
│   ├── annotate.py       # Stage 3: Annotate
│   ├── score.py          # Stage 4: Score
│   ├── emit.py           # Stage 5: Emit
│   ├── validate.py       # Stage 6: Validate
│   ├── graph_builder.py  # Build knowledge graph
│   └── schemas.py        # Pydantic models
├── site/                 # Next.js static site
│   ├── app/              # App router pages
│   └── package.json
├── .github/workflows/    # CI/CD
├── requirements.txt
└── package.json
```

---

## Contributing

1. Create a feature branch from `main`
2. Make changes; ensure `python -m pipeline.validate` and `npm run site:build` pass
3. Submit a pull request
4. CI will run validation and build automatically

---

## License

**CC BY-NC-SA 4.0** (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International)

You may share and adapt the work for non-commercial purposes, with attribution and under the same license.
