"""Deterministic CSV tables and their manifest.

UTF-8 without a BOM, LF line endings, headers carrying units (CONTEXT.md section
1). Site codes only: no internal slug and no frozen filename reaches a cell,
because both carry the school-derived site identifiers C7 bars from public output.
"""

from __future__ import annotations

import csv
import json
from pathlib import Path


class Table:
    def __init__(
        self,
        table_id: str,
        title: str,
        caption: str,
        source_note: str,
        units: dict[str, str],
        columns: list[str],
        rows: list[list],
    ):
        self.id = table_id
        self.title = title
        self.caption = caption
        self.source_note = source_note
        self.units = units
        self.columns = columns
        self.rows = rows

    @property
    def filename(self) -> str:
        return f"{self.id}.csv"

    def write(self, out_dir: Path) -> Path:
        path = out_dir / self.filename
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="") as handle:
            writer = csv.writer(handle, lineterminator="\n")
            writer.writerow(self.columns)
            writer.writerows(self.rows)
        return path

    def manifest_entry(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "caption": self.caption,
            "source_note": self.source_note,
            "units": self.units,
            "file": self.filename,
            "columns": self.columns,
            "row_count": len(self.rows),
        }


def write_tables(tables: list[Table], out_dir: Path) -> list[Path]:
    written = [table.write(out_dir) for table in tables]
    manifest = {"tables": [t.manifest_entry() for t in tables]}
    path = out_dir / "tables.json"
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    written.append(path)
    return written
