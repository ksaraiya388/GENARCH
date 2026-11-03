"""Figure colours, read from the site's own design tokens at run time.

Every hex comes out of `site/tailwind.config.ts`; nothing here hard-codes one, so
the figures cannot drift from the site. The report prints on white, so the dark
surface palette in `site/src/components/deq/palette.ts` is deliberately not used.

Four roles, with different contrast obligations:

    data marks  series lines, scatter points, bars, and every reference line a
                reader has to read a value against. Must clear 3:1 against white,
                and must also differ in line style or marker shape so identity
                never rests on colour alone.
    text        labels, tick marks, annotations. Must clear 4.5:1 against the
                surface they sit on.
    wash        the shaded date spans on F01. These carry no value and may stay
                light, but a wash is only legible if its boundary is, so every
                wash is drawn with a `wash_edge()` outline that clears the
                data-mark floor and is named by a text label inside the axes.
    grid        gridlines, legend frames. Decoration behind the data; no floor.

There is no exempt role. The reference line used to sit in a `chrome` role that was
exempt from the data-mark floor on the grounds that it marks the level of a standard
rather than a category. That was wrong: on F04 the whole point of the line is that a
reader compares six plotted percentiles against it, which makes it a mark they read a
value off, and at `cool.mid` it carried 2.56:1 on white. It is a data mark and clears
3:1 like the rest.
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TAILWIND_CONFIG = REPO_ROOT / "site" / "tailwind.config.ts"

_GROUP_RE = re.compile(r"(\w+):\s*\{([^{}]*)\}", re.S)
_HEX_RE = re.compile(r"(\w+):\s*\"(#[0-9A-Fa-f]{6})\"")


@lru_cache(maxsize=1)
def tokens(path: Path | None = None) -> dict[str, str]:
    """Flat `group.key -> #rrggbb` map parsed from the Tailwind colour config."""
    source = (path or TAILWIND_CONFIG).read_text(encoding="utf-8")
    start = source.index("colors:")
    out: dict[str, str] = {}
    for group, body in _GROUP_RE.findall(source[start:]):
        for key, hex_value in _HEX_RE.findall(body):
            out[f"{group}.{key}"] = hex_value.upper()
    if "navy.deep" not in out or "teal.dim" not in out:
        raise RuntimeError(f"could not parse colour tokens from {path or TAILWIND_CONFIG}")
    return out


def token(name: str) -> str:
    return tokens()[name]


# ------------------------------------------------------------------- roles

WHITE = "#FFFFFF"


def ink() -> str:
    """Axes, labels and body text."""
    return token("navy.deep")


def series() -> tuple[str, str]:
    """The two data-mark colours, both clearing 3:1 on white."""
    return token("navy.deep"), token("teal.dim")


def series_styles() -> tuple[dict, dict]:
    """Redundant encoding, so the two series never depend on colour alone."""
    primary, secondary = series()
    return (
        {"color": primary, "linestyle": "-", "marker": "o"},
        {"color": secondary, "linestyle": "--", "marker": "s"},
    )


def reference() -> str:
    """Reference lines: the 35 microgram level on F04, the 1:1 line on F03.

    A data mark, held to the 3:1 floor. `cool.dark` is the Tailwind slate-500 token
    and the darkest grey in the config, at 4.76:1 on white, so it clears the data-mark
    floor and the text floor both; a label drawn in it reads as well as the line.
    """
    return token("cool.dark")


def wash() -> str:
    """The fill of a shaded date span. Light by design; see `wash_edge()`."""
    return token("cool.mid")


def wash_edge() -> str:
    """The outline of a shaded date span, so the span's boundary clears 3:1."""
    return token("cool.dark")


def grid() -> str:
    return token("surface.muted")


DATA_MARK_MIN_CONTRAST = 3.0
TEXT_MIN_CONTRAST = 4.5

# Every mark a reader reads a value from or against. The contrast test takes this
# list, so a new mark is covered by adding it here and nothing is exempt.
def data_marks() -> tuple[str, ...]:
    """Every colour held to `DATA_MARK_MIN_CONTRAST`."""
    return (*series(), reference(), wash_edge())


# -------------------------------------------------------------- contrast

def _channel(value: int) -> float:
    srgb = value / 255
    return srgb / 12.92 if srgb <= 0.04045 else ((srgb + 0.055) / 1.055) ** 2.4


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def contrast_ratio(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    lighter, darker = max(la, lb), min(la, lb)
    return (lighter + 0.05) / (darker + 0.05)


def readable_on(background: str) -> str:
    """Whichever of ink or white reads better on `background`."""
    dark, light = ink(), token("surface.white")
    return dark if contrast_ratio(dark, background) >= contrast_ratio(light, background) else light


# ------------------------------------------------------------ sequential

# Start just off white so the lightest cell still reads as a cell.
_RAMP_START = (0xF2, 0xFA, 0xF8)


def _mix(fraction: float) -> str:
    end = token("teal.dim").lstrip("#")
    target = tuple(int(end[i : i + 2], 16) for i in (0, 2, 4))
    blended = tuple(
        round(start + (stop - start) * fraction)
        for start, stop in zip(_RAMP_START, target)
    )
    return "#{:02X}{:02X}{:02X}".format(*blended)


@lru_cache(maxsize=1)
def _ramp_ceiling() -> float:
    """How far toward teal.dim the ramp may go and still take dark text.

    Every heatmap cell prints its value, so the darkest cell has to clear 4.5:1
    against the ink colour. Running the ramp all the way to teal.dim leaves a
    band in the middle where neither dark nor light text clears the floor.
    """
    ceiling = 0.0
    step = 0.0
    while step <= 1.0:
        if contrast_ratio(ink(), _mix(step)) >= TEXT_MIN_CONTRAST:
            ceiling = step
        step += 0.005
    return ceiling


def sequential(fraction: float) -> str:
    """Single-hue teal ramp, white through to the darkest legible teal.

    `fraction` runs 0 (lightest) to 1 (darkest).
    """
    fraction = min(max(fraction, 0.0), 1.0)
    return _mix(fraction * _ramp_ceiling())
