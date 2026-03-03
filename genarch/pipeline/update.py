from __future__ import annotations

from pathlib import Path
from typing import Literal

import typer
from rich.console import Console

from pipeline.models import Community, Disease, Exposure, Gene, Graph, GraphMetadata, Pathway
from pipeline.paths import data_root, sources_root
from pipeline.utils import read_json, write_json


app = typer.Typer(add_completion=False, no_args_is_help=True)
console = Console()

Scope = Literal["all", "disease", "exposure", "gene", "pathway", "community", "graph"]


def _load_source(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(path)
    return read_json(path)


def _emit_index(entity_dir: Path) -> None:
    items = []
    for p in sorted(entity_dir.glob("*.json")):
        if p.name == "index.json":
            continue
        data = read_json(p)
        items.append(
            {
                "slug": data.get("slug"),
                "name": data.get("name") or data.get("symbol") or data.get("label"),
                "summary": data.get("summary"),
                "last_updated": data.get("last_updated"),
            }
        )
    write_json(entity_dir / "index.json", {"items": items})


def _update_disease(entity_id: str | None) -> None:
    src_dir = sources_root() / "diseases"
    out_dir = data_root() / "diseases"
    if entity_id:
        srcs = [src_dir / f"{entity_id}.json"]
    else:
        srcs = sorted([p for p in src_dir.glob("*.json") if p.is_file()])
    for src in srcs:
        d = Disease.model_validate(_load_source(src))
        write_json(out_dir / f"{d.slug}.json", d.model_dump(mode="json"))
    _emit_index(out_dir)


def _update_exposure(entity_id: str | None) -> None:
    src_dir = sources_root() / "exposures"
    out_dir = data_root() / "exposures"
    if entity_id:
        srcs = [src_dir / f"{entity_id}.json"]
    else:
        srcs = sorted([p for p in src_dir.glob("*.json") if p.is_file()])
    for src in srcs:
        e = Exposure.model_validate(_load_source(src))
        write_json(out_dir / f"{e.slug}.json", e.model_dump(mode="json"))
    _emit_index(out_dir)


def _update_gene(entity_id: str | None) -> None:
    src_dir = sources_root() / "genes"
    out_dir = data_root() / "genes"
    if entity_id:
        srcs = [src_dir / f"{entity_id}.json"]
    else:
        srcs = sorted([p for p in src_dir.glob("*.json") if p.is_file()])
    for src in srcs:
        g = Gene.model_validate(_load_source(src))
        write_json(out_dir / f"{g.slug}.json", g.model_dump(mode="json"))
    _emit_index(out_dir)


def _update_pathway(entity_id: str | None) -> None:
    src_dir = sources_root() / "pathways"
    out_dir = data_root() / "pathways"
    if entity_id:
        srcs = [src_dir / f"{entity_id}.json"]
    else:
        srcs = sorted([p for p in src_dir.glob("*.json") if p.is_file()])
    for src in srcs:
        pw = Pathway.model_validate(_load_source(src))
        write_json(out_dir / f"{pw.slug}.json", pw.model_dump(mode="json"))
    _emit_index(out_dir)


def _update_community(entity_id: str | None) -> None:
    src_dir = sources_root() / "community"
    out_dir = data_root() / "community"
    if entity_id:
        srcs = [src_dir / f"{entity_id}.json"]
    else:
        srcs = sorted([p for p in src_dir.glob("*.json") if p.is_file()])
    for src in srcs:
        c = Community.model_validate(_load_source(src))
        write_json(out_dir / f"{c.slug}.json", c.model_dump(mode="json"))
    _emit_index(out_dir)


def _update_graph() -> None:
    src = sources_root() / "graph" / "graph.json"
    g = Graph.model_validate(_load_source(src))
    # Ensure counts are correct without introducing non-deterministic timestamps.
    g = g.model_copy(
        update={
            "metadata": GraphMetadata.model_validate(
                {
                    **g.metadata.model_dump(mode="json"),
                    "node_count": len(g.nodes),
                    "edge_count": len(g.edges),
                }
            )
        }
    )
    write_json(data_root() / "graph" / "graph.json", g.model_dump(mode="json"))


@app.command()
def main(
    scope: Scope = typer.Option(..., "--scope"),
    entity_id: str | None = typer.Option(None, "--id"),
) -> None:
    """
    Run the deterministic GENARCH pipeline for the requested scope.
    """
    if scope == "all":
        _update_disease(None)
        _update_exposure(None)
        _update_gene(None)
        _update_pathway(None)
        _update_community(None)
        _update_graph()
        console.print("[bold green]Pipeline update complete[/bold green]")
        return

    if scope == "disease":
        _update_disease(entity_id)
    elif scope == "exposure":
        _update_exposure(entity_id)
    elif scope == "gene":
        _update_gene(entity_id)
    elif scope == "pathway":
        _update_pathway(entity_id)
    elif scope == "community":
        _update_community(entity_id)
    elif scope == "graph":
        _update_graph()
    else:
        raise typer.BadParameter(f"unknown scope: {scope}")

    console.print("[bold green]Pipeline update complete[/bold green]")


if __name__ == "__main__":
    app()

