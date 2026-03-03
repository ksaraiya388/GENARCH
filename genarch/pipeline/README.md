# GENARCH Pipeline

This package implements the deterministic GENARCH ETL pipeline, schema validation, and report
generation commands required by the PRD.

Required CLI entrypoints (run from repo root):

- `python -m pipeline.update --scope all`
- `python -m pipeline.update --scope disease --id asthma`
- `python -m pipeline.validate`
- `python -m pipeline.report --year 2026`

