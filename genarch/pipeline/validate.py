from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import typer
from rich.console import Console

from pipeline.models import Community, Disease, Exposure, Gene, Graph, Pathway
from pipeline.paths import data_root
from pipeline.utils import read_json


app = typer.Typer(add_completion=False, no_args_is_help=False)
console = Console()


@dataclass(frozen=True)
class ValidationResult:
    ok: bool
    errors: list[str]


def _collect_json_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted([p for p in root.rglob("*.json") if p.is_file()])


def _validate_entity_files() -> tuple[dict[str, set[str]], list[str]]:
    dr = data_root()
    errors: list[str] = []

    slugs: dict[str, set[str]] = {
        "diseases": set(),
        "exposures": set(),
        "genes": set(),
        "pathways": set(),
        "community": set(),
    }

    # Diseases
    for p in _collect_json_files(dr / "diseases"):
        if p.name == "index.json":
            continue
        try:
            d = Disease.model_validate(read_json(p))
            slugs["diseases"].add(d.slug)
            _validate_citations(p, d.references, _collect_citation_ids_from_disease(d), errors)
        except Exception as e:  # noqa: BLE001 - surface validation errors verbosely
            errors.append(f"{p}: {e}")

    # Exposures
    for p in _collect_json_files(dr / "exposures"):
        if p.name == "index.json":
            continue
        try:
            e = Exposure.model_validate(read_json(p))
            slugs["exposures"].add(e.slug)
            _validate_citations(p, e.references, _collect_citation_ids_generic(e), errors)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{p}: {e}")

    # Genes
    for p in _collect_json_files(dr / "genes"):
        if p.name == "index.json":
            continue
        try:
            g = Gene.model_validate(read_json(p))
            slugs["genes"].add(g.slug)
            _validate_citations(p, g.references, _collect_citation_ids_generic(g), errors)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{p}: {e}")

    # Pathways
    for p in _collect_json_files(dr / "pathways"):
        if p.name == "index.json":
            continue
        try:
            pw = Pathway.model_validate(read_json(p))
            slugs["pathways"].add(pw.slug)
            _validate_citations(p, pw.references, _collect_citation_ids_generic(pw), errors)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{p}: {e}")

    # Community
    for p in _collect_json_files(dr / "community"):
        if p.name == "index.json":
            continue
        try:
            c = Community.model_validate(read_json(p))
            slugs["community"].add(c.slug)
            _validate_citations(p, c.references, _collect_citation_ids_generic(c), errors)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{p}: {e}")

    # Graph
    graph_path = dr / "graph" / "graph.json"
    if graph_path.exists():
        try:
            graph = Graph.model_validate(read_json(graph_path))
            node_ids = {n.id for n in graph.nodes}
            for edge in graph.edges:
                if edge.source not in node_ids:
                    errors.append(f"{graph_path}: edge {edge.id} source missing: {edge.source}")
                if edge.target not in node_ids:
                    errors.append(f"{graph_path}: edge {edge.id} target missing: {edge.target}")
        except Exception as e:  # noqa: BLE001
            errors.append(f"{graph_path}: {e}")
    else:
        errors.append(f"{graph_path}: missing required graph.json")

    return slugs, errors


def _validate_cross_links(slugs: dict[str, set[str]], errors: list[str]) -> None:
    dr = data_root()
    for p in _collect_json_files(dr / "diseases"):
        if p.name == "index.json":
            continue
        try:
            d = Disease.model_validate(read_json(p))
        except Exception:
            continue
        for em in d.exposure_modifiers:
            if em.exposure_slug not in slugs["exposures"]:
                errors.append(f"{p}: exposure_slug not found: {em.exposure_slug}")


def _validate_citations(
    path: Path, references: list[object], used_ids: set[str], errors: list[str]
) -> None:
    ref_ids: set[str] = set()
    for r in references:
        rid = getattr(r, "id", None)
        if isinstance(rid, str):
            ref_ids.add(rid)
    missing = sorted([cid for cid in used_ids if cid not in ref_ids])
    if missing:
        errors.append(f"{path}: citation ids missing in references: {missing}")


def _collect_citation_ids_generic(model: object) -> set[str]:
    used: set[str] = set()
    if hasattr(model, "references"):
        pass
    # Conservatively walk common citation-containing fields that are lists of dicts / models.
    for field_name in dir(model):
        if field_name.startswith("_"):
            continue
        try:
            value = getattr(model, field_name)
        except Exception:
            continue
        used |= _walk_for_citation_ids(value)
    return used


def _collect_citation_ids_from_disease(d: Disease) -> set[str]:
    used: set[str] = set()
    for locus in d.genetic_architecture.top_loci:
        used |= set(locus.citations)
    for em in d.exposure_modifiers:
        used |= set(em.citations)
    for t in d.tissues:
        used |= set(t.citations)
    return used


def _walk_for_citation_ids(value: object) -> set[str]:
    used: set[str] = set()
    if isinstance(value, list):
        for v in value:
            used |= _walk_for_citation_ids(v)
        return used
    if isinstance(value, dict):
        for v in value.values():
            used |= _walk_for_citation_ids(v)
        return used
    if hasattr(value, "__dict__") and not isinstance(value, (str, int, float, bool)):
        # Pydantic models
        for v in value.__dict__.values():
            used |= _walk_for_citation_ids(v)
        return used
    if isinstance(value, str):
        return used
    return used


@app.command()
def main() -> None:
    slugs, errors = _validate_entity_files()
    _validate_cross_links(slugs, errors)

    if errors:
        console.print("[bold red]Validation failed[/bold red]")
        for e in errors:
            console.print(f"- {e}")
        raise typer.Exit(code=1)

    console.print("[bold green]Validation OK[/bold green]")


if __name__ == "__main__":
    app()

