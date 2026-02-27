"""Generate annual report. Takes --year argument."""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path


def _resolve_data_dir() -> Path:
    root = Path(__file__).resolve().parent.parent
    return root / "data"


def _resolve_reports_dir() -> Path:
    return _resolve_data_dir() / "reports"


def generate_report(year: str | int) -> Path:
    """Generate annual report index for given year."""
    year_str = str(year)
    reports_dir = _resolve_reports_dir()
    year_dir = reports_dir / year_str
    year_dir.mkdir(parents=True, exist_ok=True)

    index_path = year_dir / "index.json"
    now = datetime.utcnow().strftime("%Y-%m-%d")

    content = {
        "year": year_str,
        "title": f"GENARCH Annual Report {year_str}",
        "slug": year_str,
        "summary": f"Annual summary of atlas updates, data sources, and community engagement for {year_str}.",
        "content": f"## GENARCH Annual Report {year_str}\n\n"
        f"This report summarizes the GENARCH atlas updates for {year_str}.\n\n"
        f"### Highlights\n- Curated disease profiles with genetic architecture and exposure modifiers\n"
        f"- Exposure definitions and system-level effects\n- Gene and pathway annotations\n"
        f"- Mechanism briefs explaining GxE hypotheses\n- Knowledge graph of entity relationships\n"
        f"- Community module foundations\n\n"
        f"### Data Sources\n- GWAS Catalog, GTEx, literature curation\n"
        f"- See /methods for full pipeline documentation\n",
        "pdf_path": None,
    }

    index_path.write_text(
        json.dumps(content, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return index_path


def run_report(year: str | int | None = None) -> int:
    """Run report generation. Returns 0 on success, 1 on error."""
    y = year or datetime.now().year
    try:
        path = generate_report(y)
        print(f"Report generated: {path}")
        return 0
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    year_arg = None
    for i, a in enumerate(sys.argv):
        if a == "--year" and i + 1 < len(sys.argv):
            year_arg = sys.argv[i + 1]
            break
    sys.exit(run_report(year_arg))
