from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    s = value.strip().lower()
    s = s.replace("κ", "k")
    s = _slug_re.sub("-", s).strip("-")
    s = re.sub(r"-{2,}", "-", s)
    if not s:
        raise ValueError("slugify produced empty slug")
    return s


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
    path.write_text(rendered + "\n", encoding="utf-8")

