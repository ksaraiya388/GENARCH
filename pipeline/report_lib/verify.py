"""CONTEXT value against recomputed value, for every R1-R4 figure.

The report may state only the findings in `docs/report-2026/CONTEXT.md` section 4,
and it states them from values recomputed at the freeze. This prints the two side
by side so a divergence is visible rather than silent. A value that fails to
reproduce stops the work; the code is never adjusted to force a match.
"""

from __future__ import annotations

from dataclasses import dataclass

from pipeline.report_lib.collocation import RULES_SECTION_9
from pipeline.report_lib.rounding import half_up

# CONTEXT.md section 4, R3. Common window 2026-06-18 to 2026-08-07, 18 of 24,
# exact zeros treated as missing, whole days through 2026-08-07.
CONTEXT_R3_STANDARD = {
    "farmwell-middle": (45.402, 50),
    "belfort-park": (40.189, 50),
    "golf-course": (40.123, 51),
    "sterling-ms": (38.215, 51),
    "ashburn-collocated": (37.097, 51),
    "dulles-area": (29.500, 50),
}
CONTEXT_R3_CLOCK = {
    "farmwell-middle": (47.916, 50),
    "belfort-park": (42.689, 50),
    "golf-course": (42.620, 51),
    "sterling-ms": (40.442, 51),
    "ashburn-collocated": (39.167, 51),
    "dulles-area": (31.783, 49),
}
# CONTEXT.md section 4, R2 and R4.
CONTEXT_R2 = {"n_match": 118, "n_days": 119, "mean_abs_diff": 0.0017,
              "window_start": "2026-03-03", "window_end": "2026-08-09"}
CONTEXT_R4 = {"r_min": 0.886, "r_max": 0.966}


@dataclass
class Row:
    claim: str
    context: str
    recomputed: str
    match: bool


def _num(value, places: int) -> str:
    return "-" if value is None else f"{half_up(value, places):.{places}f}"


def build_rows(results: dict, codes) -> list[Row]:
    """Every R1-R4 comparison, in report order."""
    rows: list[Row] = []

    # R1. CONTEXT defers to GENARCH_RULES section 9 (DECISIONS D2); the recorded
    # reproduction there is the comparison target, at three decimals.
    for fit in results["collocation"]:
        recorded = RULES_SECTION_9[fit["key"]]
        for field, places in (("intercept", 3), ("slope", 3), ("r2", 3)):
            expected = recorded[field]
            actual = fit[f"gx_{field}"]
            rows.append(
                Row(
                    f"R1 {fit['key']} {field}",
                    _num(expected, places),
                    _num(actual, places),
                    half_up(actual, places) == expected,
                )
            )
        rows.append(
            Row(
                f"R1 {fit['key']} n",
                str(recorded["n"]),
                str(fit["n_pairs"]),
                fit["n_pairs"] == recorded["n"],
            )
        )

    # R2.
    rec = results["reconciliation"]
    rows.append(
        Row(
            "R2 comparable days",
            str(CONTEXT_R2["n_days"]),
            str(rec["n_days"]),
            rec["n_days"] == CONTEXT_R2["n_days"],
        )
    )
    rows.append(
        Row(
            "R2 matching days",
            str(CONTEXT_R2["n_match"]),
            str(rec["n_match"]),
            rec["n_match"] == CONTEXT_R2["n_match"],
        )
    )
    rows.append(
        Row(
            "R2 mean absolute difference",
            _num(CONTEXT_R2["mean_abs_diff"], 4),
            _num(rec["mean_abs_diff"], 4),
            half_up(rec["mean_abs_diff"], 4) == CONTEXT_R2["mean_abs_diff"],
        )
    )
    for bound in ("window_start", "window_end"):
        rows.append(
            Row(
                f"R2 {bound.replace('_', ' ')}",
                CONTEXT_R2[bound],
                str(rec[bound]),
                rec[bound] == CONTEXT_R2[bound],
            )
        )

    # R3, both day definitions, reported by site code.
    for label, expected, key in (
        ("standard", CONTEXT_R3_STANDARD, "p98_common_standard"),
        ("clock", CONTEXT_R3_CLOCK, "p98_common_clock"),
    ):
        for site_id, (value, days) in sorted(expected.items(), key=lambda kv: -kv[1][0]):
            code = codes(site_id)
            got = results[key][site_id]
            rows.append(
                Row(
                    f"R3 {label} p98 {code}",
                    _num(value, 2),
                    _num(got["p98"], 2),
                    half_up(got["p98"], 2) == half_up(value, 2),
                )
            )
            rows.append(
                Row(
                    f"R3 {label} valid days {code}",
                    str(days),
                    str(got["days"]),
                    got["days"] == days,
                )
            )
        above = sum(1 for v in results[key].values() if v["p98"] > 35)
        rows.append(Row(f"R3 {label} sites above 35", "5 of 6", f"{above} of 6", above == 5))
        ranked = sorted(results[key].items(), key=lambda kv: -kv[1]["p98"])
        rank = [s for s, _ in ranked].index("sterling-ms") + 1
        rows.append(
            Row(f"R3 {label} rank of the Table 4 sensor", "4", str(rank), rank == 4)
        )

    # R4.
    corr = results["correlation"]
    for bound, label in (("r_min", "minimum"), ("r_max", "maximum")):
        rows.append(
            Row(
                f"R4 correlation {label}",
                _num(CONTEXT_R4[bound], 3),
                _num(corr[bound], 3),
                half_up(corr[bound], 3) == CONTEXT_R4[bound],
            )
        )
    return rows


def render(rows: list[Row]) -> str:
    header = ("CONTEXT claim", "CONTEXT value", "recomputed", "match")
    widths = [
        max(len(header[0]), max(len(r.claim) for r in rows)),
        max(len(header[1]), max(len(r.context) for r in rows)),
        max(len(header[2]), max(len(r.recomputed) for r in rows)),
        len(header[3]),
    ]
    lines = [
        "  ".join(h.ljust(w) for h, w in zip(header, widths)),
        "  ".join("-" * w for w in widths),
    ]
    for row in rows:
        lines.append(
            "  ".join(
                [
                    row.claim.ljust(widths[0]),
                    row.context.rjust(widths[1]),
                    row.recomputed.rjust(widths[2]),
                    ("yes" if row.match else "NO").ljust(widths[3]),
                ]
            )
        )
    failed = [r for r in rows if not r.match]
    lines.append("")
    lines.append(
        f"{len(rows) - len(failed)} of {len(rows)} reproduce"
        + ("" if not failed else f"; {len(failed)} FAILED")
    )
    return "\n".join(lines)
