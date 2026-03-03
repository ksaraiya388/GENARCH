"""Pipeline orchestrator entrypoint."""

from __future__ import annotations

import argparse
from typing import Any

from .annotate import annotate_bundle
from .emit import emit_bundle
from .ingest import load_seed_source, source_hash
from .normalize import normalize_bundle
from .paths import SOURCES_DIR
from .score import score_bundle


def _filter_scope(bundle: dict[str, Any], scope: str, entity_id: str | None) -> dict[str, Any]:
    """Apply a narrow update scope while preserving deterministic output."""

    if scope == "all":
        return bundle
    if entity_id is None:
        raise ValueError(f"--id is required when scope is '{scope}'")

    scoped = dict(bundle)
    section_map = {
        "disease": "diseases",
        "exposure": "exposures",
        "gene": "genes",
        "pathway": "pathways",
        "community": "community",
    }

    if scope not in section_map:
        return bundle

    section_name = section_map[scope]
    items = scoped.get(section_name, [])
    filtered = [item for item in items if item.get("slug") == entity_id or item.get("id") == entity_id]
    if not filtered:
        raise ValueError(f"No {scope} entity matched --id '{entity_id}'")
    scoped[section_name] = filtered
    return scoped


def run(scope: str, entity_id: str | None) -> None:
    source_path = SOURCES_DIR / "seed.json"
    print(f"Loading source: {source_path}")
    print(f"Source SHA256: {source_hash(source_path)}")

    bundle = load_seed_source()
    bundle = normalize_bundle(bundle)
    bundle = annotate_bundle(bundle)
    bundle = score_bundle(bundle)

    if scope != "all":
        bundle = _filter_scope(bundle, scope, entity_id)

    emit_bundle(bundle)
    print(f"Pipeline update completed for scope='{scope}' id='{entity_id or 'N/A'}'.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run GENARCH ETL update pipeline.")
    parser.add_argument(
        "--scope",
        default="all",
        choices=["all", "disease", "exposure", "gene", "pathway", "community"],
        help="Scope of update run.",
    )
    parser.add_argument("--id", default=None, help="Entity slug or id for scoped updates.")
    args = parser.parse_args()

    run(scope=args.scope, entity_id=args.id)


if __name__ == "__main__":
    main()
