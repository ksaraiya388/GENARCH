from __future__ import annotations

from pathlib import Path


def repo_root() -> Path:
    # /.../genarch/pipeline/<thisfile> -> parents[2] = repo root
    return Path(__file__).resolve().parents[2]


def genarch_root() -> Path:
    return repo_root() / "genarch"


def data_root() -> Path:
    return genarch_root() / "data"


def sources_root() -> Path:
    return genarch_root() / "pipeline" / "sources"

