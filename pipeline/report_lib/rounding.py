"""Deterministic rounding.

Python's built-in `round()` is banker's rounding: `round(0.725, 2)` gives 0.72.
DEQ, and every published table this report checks against, round half away from
zero. Every number written to `numbers.json` or a CSV goes through `half_up`.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def half_up(value: float | Decimal | None, places: int) -> float | None:
    """Round half away from zero to `places` decimals, returning a float."""
    if value is None:
        return None
    quantum = Decimal(1).scaleb(-places)
    return float(Decimal(str(value)).quantize(quantum, rounding=ROUND_HALF_UP))


def decimals_of(published: float) -> int:
    """How many decimals a published figure was printed to.

    DEQ prints its coefficients to two significant figures, which lands on a
    different number of decimals per value: 1.3 and -4.7 carry one, 0.83 and
    0.73 carry two. The comparison has to use the precision of the value it is
    being made against, not a single global precision.
    """
    text = format(Decimal(str(published)), "f")
    return len(text.split(".")[1]) if "." in text else 0


def matches_at_published_precision(recomputed: float, published: float) -> bool:
    """True when `recomputed`, rounded to the decimals DEQ printed, equals DEQ's value."""
    return half_up(recomputed, decimals_of(published)) == published
