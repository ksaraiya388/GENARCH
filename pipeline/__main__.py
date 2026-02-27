"""CLI helper for `python -m pipeline`."""

from __future__ import annotations


def main() -> None:
    print(
        "Use explicit modules:\n"
        "  python -m pipeline.update --scope all\n"
        "  python -m pipeline.validate\n"
        "  python -m pipeline.report --year 2026"
    )


if __name__ == "__main__":
    main()
