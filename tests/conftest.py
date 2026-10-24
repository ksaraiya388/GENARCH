"""Shared fixtures for the report tests.

The generator is run once per session into a temporary directory, so no test
touches `data/reports/2026/`.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

FREEZE_PATH = REPO_ROOT / "data" / "reports" / "2026" / "FREEZE.json"


@pytest.fixture(scope="session")
def freeze_path() -> Path:
    assert FREEZE_PATH.is_file(), f"missing freeze: {FREEZE_PATH}"
    return FREEZE_PATH


@pytest.fixture(scope="session")
def freeze(freeze_path):
    from pipeline.report_lib.freeze import Freeze

    return Freeze(freeze_path)


@pytest.fixture(scope="session")
def results(freeze):
    from pipeline.report import compute

    return compute(freeze)


@pytest.fixture(scope="session")
def report_dir(freeze_path, tmp_path_factory) -> Path:
    """One full generator run, into a temporary directory."""
    from pipeline.report import run_report

    out = tmp_path_factory.mktemp("report-run-1")
    assert run_report(year=2026, freeze=freeze_path, out_dir=out) == 0
    return out


@pytest.fixture(scope="session")
def numbers(report_dir) -> dict:
    return json.loads((report_dir / "numbers.json").read_text(encoding="utf-8"))
