from __future__ import annotations

import typer
from rich.console import Console

from pipeline.update import _update_graph


app = typer.Typer(add_completion=False, no_args_is_help=False)
console = Console()


@app.command()
def main() -> None:
    _update_graph()
    console.print("[bold green]Graph rebuilt[/bold green]")


if __name__ == "__main__":
    app()

