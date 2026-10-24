"""The numbers registry.

`numbers.json` is a flat map of dotted keys to a record carrying the value, its
unit, the precision it was rounded to, the n behind it, the window and day
definition it was computed on, the method, and the frozen inputs it came from.
Report prose cites these keys and types no decimal (CONTEXT.md section 8).

Numeric values are rounded half away from zero to a stated precision and stored
as JSON numbers. Dates, labels and statuses are strings with a null precision.
"""

from __future__ import annotations

import json
from pathlib import Path

from pipeline.report_lib.rounding import half_up


class NumberRegistry:
    """Accumulates report numbers and writes them deterministically."""

    def __init__(self) -> None:
        self._records: dict[str, dict] = {}

    def add(
        self,
        key: str,
        value,
        *,
        unit: str | None = None,
        precision: int | None = None,
        n: int | None = None,
        window: str | None = None,
        method: str,
        inputs: list[dict] | None = None,
    ) -> None:
        if key in self._records:
            raise KeyError(f"duplicate numbers.json key: {key}")
        if precision is not None:
            value = half_up(value, precision)
        self._records[key] = {
            "value": value,
            "unit": unit,
            "precision": precision,
            "n": n,
            "window": window,
            "method": method,
            "inputs": inputs or [],
        }

    def value(self, key: str):
        return self._records[key]["value"]

    def __contains__(self, key: str) -> bool:
        return key in self._records

    def __len__(self) -> int:
        return len(self._records)

    def keys(self) -> list[str]:
        return sorted(self._records)

    def as_dict(self) -> dict:
        return {key: self._records[key] for key in sorted(self._records)}

    def write(self, path: Path) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(self.as_dict(), handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
        return path
