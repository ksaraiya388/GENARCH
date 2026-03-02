# GENARCH Product Requirements Document (Summary)

See the **GENARCH Product Requirements Document** for the full specification. This file provides a concise summary of key sections.

---

## Mission

GENARCH (Genetic Epidemiology Network for At-Risk Community Health) is a next-generation scientific web atlas designed to close the disconnect between genetic architecture and environmental exposure science. It integrates genetic epidemiology, pathway biology, and community-level environmental data to support public understanding and informed action.

---

## Key Sections

| Section | Summary |
|---------|---------|
| **Mission** | Bridge genetic and environmental health science for public benefit |
| **Modules** | Atlas (diseases, exposures, genes, pathways), Graph, Community, Passport, Mechanism Briefs, Reports |
| **Safety Constraints** | No individual risk scores; no clinical advice; no diagnosis; community content for education only |
| **Acceptance Criteria** | Schema validation passes; cross-links valid; site builds; CI green |

---

## Modules

- **Atlas**: Curated entities (diseases, exposures, genes, pathways) with evidence scoring and cross-references
- **Graph**: Interactive knowledge graph of entity relationships
- **Community**: County/tract-level hotspot model and exposure layers for environmental justice context
- **Passport**: User-generated summary document (stateless, no accounts)
- **Mechanism Briefs**: Narrative explanations of gene–environment mechanisms
- **Reports**: Annual GENARCH reports

---

## Safety Constraints

- No individual genetic risk prediction
- No clinical or diagnostic use
- Community hotspot scores for education only; no resource allocation without human review
- Plain-language commitment; no stigmatizing language

---

## Acceptance Criteria

- Pipeline validation (`python -m pipeline.validate`) passes
- All entity schemas and cross-links are valid
- Site builds successfully (`npm run site:build`)
- CI workflow passes on `main` and `cursor/*` branches
