from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal

import typer
from rich.console import Console

from pipeline.models import Community, Disease, Exposure, Gene, Graph, Pathway
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
    src = sources_root() / "diseases" / f"{entity_id or 'asthma'}.json"
    d = Disease.model_validate(_load_source(src))
    write_json(data_root() / "diseases" / f"{d.slug}.json", d.model_dump(mode="json"))
    _emit_index(data_root() / "diseases")


def _update_exposure(entity_id: str | None) -> None:
    src = sources_root() / "exposures" / f"{entity_id or 'air-pollution'}.json"
    e = Exposure.model_validate(_load_source(src))
    write_json(data_root() / "exposures" / f"{e.slug}.json", e.model_dump(mode="json"))
    _emit_index(data_root() / "exposures")


def _update_gene(entity_id: str | None) -> None:
    src = sources_root() / "genes" / f"{entity_id or 'il33'}.json"
    g = Gene.model_validate(_load_source(src))
    write_json(data_root() / "genes" / f"{g.slug}.json", g.model_dump(mode="json"))
    _emit_index(data_root() / "genes")


def _update_pathway(entity_id: str | None) -> None:
    src = sources_root() / "pathways" / f"{entity_id or 'nf-kb'}.json"
    pw = Pathway.model_validate(_load_source(src))
    write_json(data_root() / "pathways" / f"{pw.slug}.json", pw.model_dump(mode="json"))
    _emit_index(data_root() / "pathways")


def _update_community(entity_id: str | None) -> None:
    src = sources_root() / "community" / f"{entity_id or 'loudoun-county-va'}.json"
    c = Community.model_validate(_load_source(src))
    write_json(data_root() / "community" / f"{c.slug}.json", c.model_dump(mode="json"))
    _emit_index(data_root() / "community")


def _update_graph() -> None:
    src = sources_root() / "graph" / "graph.json"
    g = Graph.model_validate(_load_source(src))
    # Ensure metadata is always current and deterministic.
    g = g.model_copy(
        update={
            "metadata": {
                **g.metadata.model_dump(mode="json"),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "node_count": len(g.nodes),
                "edge_count": len(g.edges),
            }
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
        _update_disease("asthma")
        _update_exposure("air-pollution")
        _update_gene("il33")
        _update_pathway("nf-kb")
        _update_community("loudoun-county-va")
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

