"""CLI entry point for pipeline commands."""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    """Dispatch to subcommands."""
    # Allow: python -m pipeline.update --scope all
    #        python -m pipeline.validate
    #        python -m pipeline.report --year 2026
    args = sys.argv[1:]

    if not args:
        print("Usage: python -m pipeline <command> [options]")
        print("  update --scope all | disease | exposure | gene | pathway [--id <slug>]")
        print("  validate")
        print("  report --year <year>")
        return 0

    cmd = args[0].lower()

    if cmd == "update":
        from pipeline.update import run_update

        scope = "all"
        entity_id = None
        i = 1
        while i < len(args):
            if args[i] == "--scope" and i + 1 < len(args):
                scope = args[i + 1]
                i += 2
                continue
            if args[i] == "--id" and i + 1 < len(args):
                entity_id = args[i + 1]
                i += 2
                continue
            i += 1
        return run_update(scope=scope, entity_id=entity_id)

    if cmd == "validate":
        from pipeline.validate import validate

        return validate()

    if cmd == "report":
        year_arg = None
        for i, a in enumerate(args):
            if a == "--year" and i + 1 < len(args):
                year_arg = args[i + 1]
                break
        from pipeline.report import run_report

        return run_report(year_arg)

    print(f"Unknown command: {cmd}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
