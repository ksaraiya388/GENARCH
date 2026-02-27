# METHODS

## Data flow

Pipeline stages:

1. **Ingest**: read curated seed sources in `pipeline/sources/`
2. **Normalize**: canonical slug and citation normalization
3. **Annotate**: route metadata and graph metadata completion
4. **Score**: compute/normalize strength and confidence
5. **Emit**: write canonical JSON to `data/`
6. **Validate**: strict schema + cross-link + citation checks
7. **Report**: generate annual MDX + PDF report artifacts

## Strength scoring (0-1)

Additive score components:

- GWAS p-value tier:
  - `p < 5e-8`: +0.40
  - `p < 1e-5`: +0.20
  - literature-only: +0.10
- Replication in independent cohort: +0.20
- Functional validation:
  - eQTL: +0.15
  - in vitro: +0.10
  - in vivo: +0.15
  - human tissue: +0.20
- Multi-ancestry representation: +0.10

Raw values are clamped to `[0, 1]`.

## Confidence tiers

- **HIGH**: strength >= 0.70 and at least two evidence types
- **MEDIUM**: strength 0.40-0.69, or one evidence type with strength >= 0.70
- **LOW**: strength < 0.40, or single weak literature-only support

## Validation

`python -m pipeline.validate` enforces:

- strict Pydantic schemas (`extra="forbid"`, strict typing)
- cross-link existence (disease/exposure/gene/pathway/community references)
- mechanism brief slug existence
- graph node/edge integrity
- citation ID integrity

Validation failures are blocking and return non-zero exit code.
