"""Filesystem paths for pipeline stages."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
SOURCES_DIR = Path(__file__).resolve().parent / "sources"

DISEASES_DIR = DATA_DIR / "diseases"
EXPOSURES_DIR = DATA_DIR / "exposures"
GENES_DIR = DATA_DIR / "genes"
PATHWAYS_DIR = DATA_DIR / "pathways"
GRAPH_DIR = DATA_DIR / "graph"
COMMUNITY_DIR = DATA_DIR / "community"
REPORTS_DIR = DATA_DIR / "reports"

SITE_CONTENT_DIR = ROOT / "site" / "content"
BRIEFS_DIR = SITE_CONTENT_DIR / "briefs"


def ensure_directories() -> None:
    """Create all output directories if missing."""

    for path in [
        DATA_DIR,
        DISEASES_DIR,
        EXPOSURES_DIR,
        GENES_DIR,
        PATHWAYS_DIR,
        GRAPH_DIR,
        COMMUNITY_DIR,
        REPORTS_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)
