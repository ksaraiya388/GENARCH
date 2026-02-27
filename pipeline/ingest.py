"""Parse source files from pipeline/sources/ (TSV, CSV, JSON)."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any


def _resolve_sources_dir() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / "pipeline" / "sources"


def _resolve_data_dir() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def read_tsv(path: Path, dialect: str = "excel-tab") -> list[dict[str, Any]]:
    """Read TSV file and return list of row dicts."""
    rows: list[dict[str, Any]] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, dialect=dialect)
        for row in reader:
            rows.append(dict(row))
    return rows


def read_csv(path: Path) -> list[dict[str, Any]]:
    """Read CSV file and return list of row dicts."""
    rows: list[dict[str, Any]] = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(dict(row))
    return rows


def read_json(path: Path) -> Any:
    """Read JSON file."""
    return json.loads(path.read_text(encoding="utf-8"))


def ingest_all() -> dict[str, Any]:
    """Ingest all source files from pipeline/sources/."""
    sources_dir = _resolve_sources_dir()
    result: dict[str, Any] = {
        "diseases": [],
        "exposures": [],
        "genes": [],
        "pathways": [],
        "variants": [],
        "tissues": [],
        "citations": [],
    }

    if not sources_dir.exists():
        return result

    # Diseases
    diseases_path = sources_dir / "diseases.tsv"
    if diseases_path.exists():
        result["diseases"] = read_tsv(diseases_path)

    diseases_json = sources_dir / "diseases.json"
    if diseases_json.exists():
        data = read_json(diseases_json)
        if isinstance(data, list):
            result["diseases"].extend(data)
        elif isinstance(data, dict):
            result["diseases"].extend(data.get("diseases", []))

    # Exposures
    exposures_path = sources_dir / "exposures.tsv"
    if exposures_path.exists():
        result["exposures"] = read_tsv(exposures_path)

    exposures_json = sources_dir / "exposures.json"
    if exposures_json.exists():
        data = read_json(exposures_json)
        if isinstance(data, list):
            result["exposures"].extend(data)
        elif isinstance(data, dict):
            result["exposures"].extend(data.get("exposures", []))

    # Genes
    genes_path = sources_dir / "genes.tsv"
    if genes_path.exists():
        result["genes"] = read_tsv(genes_path)

    genes_json = sources_dir / "genes.json"
    if genes_json.exists():
        data = read_json(genes_json)
        if isinstance(data, list):
            result["genes"].extend(data)
        elif isinstance(data, dict):
            result["genes"].extend(data.get("genes", []))

    # Pathways
    pathways_path = sources_dir / "pathways.tsv"
    if pathways_path.exists():
        result["pathways"] = read_tsv(pathways_path)

    pathways_json = sources_dir / "pathways.json"
    if pathways_json.exists():
        data = read_json(pathways_json)
        if isinstance(data, list):
            result["pathways"].extend(data)
        elif isinstance(data, dict):
            result["pathways"].extend(data.get("pathways", []))

    # Variants (for annotate: variant -> gene mapping)
    variants_path = sources_dir / "variants.tsv"
    if variants_path.exists():
        result["variants"] = read_tsv(variants_path)

    variants_json = sources_dir / "variants.json"
    if variants_json.exists():
        data = read_json(variants_json)
        if isinstance(data, list):
            result["variants"].extend(data)
        elif isinstance(data, dict):
            result["variants"].extend(data.get("variants", []))

    # Tissues lookup
    tissues_path = sources_dir / "tissues.json"
    if tissues_path.exists():
        data = read_json(tissues_path)
        result["tissues"] = data if isinstance(data, list) else data.get("tissues", [])

    # Citations
    citations_path = sources_dir / "citations.json"
    if citations_path.exists():
        data = read_json(citations_path)
        result["citations"] = data if isinstance(data, list) else data.get("citations", [])

    return result
