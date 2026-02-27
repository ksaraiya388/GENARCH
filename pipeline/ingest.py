"""Stage 1: ingest curated source files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .paths import SOURCES_DIR


def load_seed_source(source_file: str = "seed.json") -> dict[str, Any]:
    """Load curated v1 source bundle from pipeline/sources."""

    path = SOURCES_DIR / source_file
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def source_hash(path: Path) -> str:
    """Compute a deterministic hash for provenance logging."""

    import hashlib

    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()
