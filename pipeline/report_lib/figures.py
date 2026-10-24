"""Report figures: SVG and 300-dpi PNG, byte-identical between runs.

Determinism comes from four things: the Agg backend, a fixed `svg.hashsalt`,
glyphs written as paths rather than font references, and metadata stripped from
both formats. Nothing here reads the clock.

Every figure draws on white with navy ink, and every data series carries a line
style or marker shape as well as a colour.
"""

from __future__ import annotations

import io
import json
import struct
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402

from pipeline.report_lib import palette  # noqa: E402

PM25_24H_LEVEL = 35
STANDARD_LINE_LABEL = (
    "35 µg/m³: level of the 24-h standard; not comparable (see §7)"
)

# CONTEXT.md section 3, read from the single constant the site shares. The text is
# never retyped here: a transcription error inside a verbatim quotation attributed to
# a state agency is not recoverable.
DEQ_LIMITATION_PATH = (
    Path(__file__).resolve().parents[2] / "site" / "src" / "content" / "deq-limitation.json"
)


@lru_cache(maxsize=1)
def deq_limitation() -> dict:
    return json.loads(DEQ_LIMITATION_PATH.read_text(encoding="utf-8"))


def deq_limitation_block() -> str:
    """The limitation, its attribution, the mandatory pairing sentence and the credit."""
    return deq_limitation()["rendered"]


def configure() -> str:
    """Set deterministic rcParams. Returns the font family actually used."""
    installed = {f.name for f in font_manager.fontManager.ttflist}
    family = "Inter" if "Inter" in installed else "DejaVu Sans"
    plt.rcdefaults()
    matplotlib.rcParams.update(
        {
            "svg.hashsalt": "genarch",
            "svg.fonttype": "path",
            "font.family": "sans-serif",
            "font.sans-serif": [family],
            "figure.dpi": 100,
            "savefig.dpi": 300,
            "figure.facecolor": "white",
            "axes.facecolor": "white",
            "savefig.facecolor": "white",
            "axes.edgecolor": palette.ink(),
            "axes.labelcolor": palette.ink(),
            "text.color": palette.ink(),
            "xtick.color": palette.ink(),
            "ytick.color": palette.ink(),
            "axes.grid": True,
            "grid.color": palette.grid(),
            "grid.linewidth": 0.6,
            "axes.axisbelow": True,
            "font.size": 9,
            "axes.titlesize": 11,
            "figure.autolayout": False,
            "path.simplify": False,
        }
    )
    return family


_PNG_STRIP = {b"tEXt", b"zTXt", b"iTXt", b"tIME", b"eXIf"}

# matplotlib opens an SVG path in text mode, so on Windows it writes CRLF.
# CONTEXT.md section 1 requires LF, so the bytes are normalised on the way out.
CRLF = bytes((13, 10))
LF = bytes((10,))


def strip_png_metadata(path: Path) -> None:
    """Drop every textual and time chunk, so two runs give identical bytes."""
    data = path.read_bytes()
    signature, out, offset = data[:8], [data[:8]], 8
    if signature != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not a PNG: {path}")
    while offset < len(data):
        (length,) = struct.unpack(">I", data[offset : offset + 4])
        chunk_type = data[offset + 4 : offset + 8]
        end = offset + 12 + length
        if chunk_type not in _PNG_STRIP:
            out.append(data[offset:end])
        offset = end
    path.write_bytes(b"".join(out))


def save(fig, out_dir: Path, figure_id: str) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    svg = out_dir / f"{figure_id}.svg"
    png = out_dir / f"{figure_id}.png"
    buffer = io.BytesIO()
    fig.savefig(buffer, format="svg", metadata={"Date": None}, bbox_inches="tight")
    svg.write_bytes(buffer.getvalue().replace(CRLF, LF))
    fig.savefig(
        png,
        format="png",
        dpi=300,
        metadata={"Software": None, "Creation Time": None},
        bbox_inches="tight",
    )
    plt.close(fig)
    strip_png_metadata(png)
    return [svg, png]


# --------------------------------------------------------------------- F01


def f01_network_timeline(out_dir: Path, spans: list[dict], marks: dict) -> list[Path]:
    """One bar per site code across dates, with the unit moves annotated."""
    fig, ax = plt.subplots(figsize=(9.5, 5.2))
    codes = [s["code"] for s in spans]
    for row, site in enumerate(spans):
        runs = [
            (mdates.date2num(a), mdates.date2num(b) - mdates.date2num(a) + 1)
            for a, b in site["runs"]
        ]
        ax.broken_barh(
            runs,
            (row - 0.32, 0.64),
            facecolors=palette.series()[0],
            edgecolors="none",
        )
        for move in site["unit_moves"]:
            ax.annotate(
                move["label"],
                xy=(mdates.date2num(move["on"]), row),
                xytext=(0, 11),
                textcoords="offset points",
                ha="center",
                fontsize=6.5,
                color=palette.series()[1],
            )
            ax.plot(
                [mdates.date2num(move["on"])],
                [row],
                marker="|",
                markersize=11,
                color=palette.series()[1],
            )

    ax.axvspan(
        mdates.date2num(marks["common_start"]),
        mdates.date2num(marks["common_end"]) + 1,
        color=palette.chrome(),
        alpha=0.18,
        zorder=0,
        label="Common window, all six sensors collecting",
    )
    ax.axvspan(
        mdates.date2num(marks["smoke_start"]),
        mdates.date2num(marks["smoke_end"]) + 1,
        color=palette.chrome(),
        alpha=0.38,
        zorder=0,
        label="Wildfire smoke transport weekend",
    )
    for when, text in marks["lines"]:
        ax.axvline(
            mdates.date2num(when), color=palette.ink(), linestyle=":", linewidth=1.1, zorder=3
        )
        ax.annotate(
            text,
            xy=(mdates.date2num(when), len(codes) - 0.3),
            xytext=(3, 0),
            textcoords="offset points",
            rotation=90,
            va="top",
            fontsize=6.5,
        )

    ax.set_yticks(range(len(codes)))
    ax.set_yticklabels(codes)
    ax.invert_yaxis()
    ax.set_ylim(len(codes) - 0.4, -0.8)
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
    ax.set_xlabel("2026")
    ax.set_ylabel("Site code")
    ax.set_title("Sensor network coverage by site code")
    ax.grid(axis="y", visible=False)
    ax.legend(loc="lower left", fontsize=7, framealpha=1, edgecolor=palette.grid())
    return save(fig, out_dir, "F01_network_timeline")


# --------------------------------------------------------------------- F02


def f02_collocation(out_dir: Path, fits: list[dict]) -> list[Path]:
    """Hourly pairs and the two regression lines, one panel per comparison."""
    fig, axes = plt.subplots(2, 2, figsize=(9.0, 7.6))
    primary, secondary = palette.series_styles()
    for ax, fit in zip(axes.ravel(), fits):
        xs = [p[0] for p in fit["pairs"]]
        ys = [p[1] for p in fit["pairs"]]
        ax.scatter(xs, ys, s=7, alpha=0.18, color=palette.ink(), edgecolors="none", zorder=2)
        lo, hi = min(xs), max(xs)
        grid = [lo + (hi - lo) * i / 100 for i in range(101)]
        ax.plot(
            grid,
            [fit["deq_intercept"] + fit["deq_slope"] * x for x in grid],
            color=primary["color"],
            linestyle=primary["linestyle"],
            linewidth=1.8,
            label="DEQ published",
            zorder=4,
        )
        ax.plot(
            grid,
            [fit["gx_intercept"] + fit["gx_slope"] * x for x in grid],
            color=secondary["color"],
            linestyle=secondary["linestyle"],
            linewidth=1.8,
            label="GENARCH OLS",
            zorder=5,
        )
        unit_label = fit["unit_id"].replace("apex-0", "APEX ").replace("apex-", "APEX ")
        ax.set_title(f"{unit_label} {fit['pollutant']}", loc="left")
        ax.set_xlabel(f"Sensor ({fit['unit']})")
        ax.set_ylabel(f"Regulatory monitor ({fit['unit']})")
        text = (
            f"DEQ:     y = {fit['deq_intercept']} + {fit['deq_slope']}x, "
            f"R² = {fit['deq_r2']}\n"
            f"GENARCH: y = {fit['gx_intercept']} + {fit['gx_slope']}x, "
            f"R² = {fit['gx_r2']}\n"
            f"n = {fit['n_pairs']:,}   {fit['status']}"
        )
        ax.text(
            0.03,
            0.97,
            text,
            transform=ax.transAxes,
            va="top",
            ha="left",
            fontsize=6.8,
            family="monospace",
            bbox={"facecolor": "white", "edgecolor": palette.grid(), "boxstyle": "round,pad=0.4"},
        )
        ax.legend(loc="lower right", fontsize=7, framealpha=1, edgecolor=palette.grid())
    fig.suptitle("Collocation: sensor against the regulatory monitor, hourly pairs", y=0.995)
    fig.tight_layout()
    return save(fig, out_dir, "F02_collocation")


# --------------------------------------------------------------------- F03


def f03_daily_reconciliation(out_dir: Path, rows: list[dict]) -> list[Path]:
    """Recomputed against published daily averages, with the one mismatch marked."""
    fig, ax = plt.subplots(figsize=(6.6, 6.2))
    agree = [r for r in rows if r["match"]]
    differ = [r for r in rows if not r["match"]]
    values = [r["recomputed"] for r in rows] + [r["published"] for r in rows]
    lo, hi = min(values), max(values)
    pad = (hi - lo) * 0.04
    ax.plot(
        [lo - pad, hi + pad],
        [lo - pad, hi + pad],
        color=palette.chrome(),
        linestyle="-",
        linewidth=1.0,
        zorder=1,
        label="1:1",
    )
    ax.scatter(
        [r["published"] for r in agree],
        [r["recomputed"] for r in agree],
        s=26,
        marker="o",
        facecolors="none",
        edgecolors=palette.series()[0],
        linewidths=0.9,
        zorder=3,
        label=f"Agrees after truncation (n = {len(agree)})",
    )
    ax.scatter(
        [r["published"] for r in differ],
        [r["recomputed"] for r in differ],
        s=64,
        marker="s",
        color=palette.series()[1],
        zorder=4,
        label=f"Differs (n = {len(differ)})",
    )
    for row in differ:
        ax.annotate(
            f"{row['date']}\n{row['recomputed']} against {row['published']}, "
            f"{row['valid_hours']} valid hours",
            xy=(row["published"], row["recomputed"]),
            xytext=(14, -26),
            textcoords="offset points",
            fontsize=7,
            color=palette.series()[1],
            arrowprops={"arrowstyle": "-", "color": palette.series()[1], "linewidth": 0.8},
        )
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("DEQ published daily average (µg/m³)")
    ax.set_ylabel("Recomputed daily average (µg/m³)")
    ax.set_title("Daily-average reconciliation, regulatory monitor")
    ax.legend(loc="upper left", fontsize=7.5, framealpha=1, edgecolor=palette.grid())
    fig.tight_layout()
    return save(fig, out_dir, "F03_daily_reconciliation")


# --------------------------------------------------------------------- F04


def f04_p98_by_site(out_dir: Path, rows: list[dict]) -> list[Path]:
    """Full-record and common-window 98th percentiles, joined per site code."""
    fig, ax = plt.subplots(figsize=(8.2, 5.0))
    primary, secondary = palette.series_styles()
    ordered = sorted(rows, key=lambda r: r["code"])
    positions = list(range(len(ordered)))
    for pos, row in zip(positions, ordered):
        ax.plot(
            [pos, pos],
            [row["full_p98"], row["common_p98"]],
            color=palette.chrome(),
            linewidth=1.4,
            zorder=2,
        )
    ax.scatter(
        positions,
        [r["full_p98"] for r in ordered],
        s=52,
        marker=primary["marker"],
        color=primary["color"],
        zorder=3,
        label="Own record",
    )
    ax.scatter(
        positions,
        [r["common_p98"] for r in ordered],
        s=52,
        marker=secondary["marker"],
        color=secondary["color"],
        zorder=3,
        label="Common window",
    )
    for pos, row in zip(positions, ordered):
        ax.annotate(
            f"{row['full_days']} d",
            xy=(pos, row["full_p98"]),
            xytext=(0, 9),
            textcoords="offset points",
            ha="center",
            fontsize=6.8,
            color=primary["color"],
        )
        ax.annotate(
            f"{row['common_days']} d",
            xy=(pos, row["common_p98"]),
            xytext=(0, -14),
            textcoords="offset points",
            ha="center",
            fontsize=6.8,
            color=secondary["color"],
        )
    ax.axhline(
        PM25_24H_LEVEL, color=palette.chrome(), linestyle="--", linewidth=1.2, zorder=1
    )
    ax.annotate(
        STANDARD_LINE_LABEL,
        xy=(0.005, PM25_24H_LEVEL),
        xycoords=("axes fraction", "data"),
        xytext=(0, 4),
        textcoords="offset points",
        fontsize=7,
        color=palette.ink(),
    )
    ax.set_xticks(positions)
    ax.set_xticklabels([r["code"] for r in ordered])
    ax.set_xlabel("Site code")
    ax.set_ylabel("98th percentile of daily averages (µg/m³)")
    ax.set_title("Record length moves the 98th percentile")
    ax.legend(loc="lower right", fontsize=7.5, framealpha=1, edgecolor=palette.grid())
    fig.tight_layout()
    return save(fig, out_dir, "F04_p98_by_site")


# --------------------------------------------------------------------- F05


def f05_correlation_heatmap(out_dir: Path, codes: list[str], matrix: dict) -> list[Path]:
    """Pairwise correlation, values printed in every cell."""
    n = len(codes)
    fig, ax = plt.subplots(figsize=(6.8, 6.0))
    lo = min(v for v in matrix.values() if v is not None)
    for i, a in enumerate(codes):
        for j, b in enumerate(codes):
            value = 1.0 if i == j else matrix.get((min(a, b), max(a, b)))
            fraction = 0.0 if value is None else (value - lo) / max(1.0 - lo, 1e-9)
            fill = palette.sequential(fraction)
            ax.add_patch(
                plt.Rectangle(
                    (j - 0.5, i - 0.5),
                    1,
                    1,
                    facecolor=fill,
                    edgecolor=palette.ink(),
                    linewidth=0.4,
                )
            )
            ax.text(
                j,
                i,
                "1.000" if i == j else f"{value:.3f}",
                ha="center",
                va="center",
                fontsize=7.6,
                color=palette.readable_on(fill),
            )
    ax.set_xlim(-0.5, n - 0.5)
    ax.set_ylim(n - 0.5, -0.5)
    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(codes, rotation=45, ha="right")
    ax.set_yticklabels(codes)
    ax.set_title("Cross-site hourly PM2.5 correlation, smoke window excluded")
    ax.grid(visible=False)
    fig.tight_layout()
    return save(fig, out_dir, "F05_correlation_heatmap")


# --------------------------------------------------------------- manifest


def write_manifest(entries: list[dict], out_dir: Path) -> Path:
    path = out_dir / "figures.json"
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump({"figures": entries}, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    return path


def contiguous_runs(days: list[date]) -> list[tuple[date, date]]:
    """Collapse sorted days into inclusive (first, last) runs."""
    runs: list[tuple[date, date]] = []
    for day in sorted(days):
        if runs and day - runs[-1][1] == timedelta(days=1):
            runs[-1] = (runs[-1][0], day)
        else:
            runs.append((day, day))
    return runs


def as_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()
