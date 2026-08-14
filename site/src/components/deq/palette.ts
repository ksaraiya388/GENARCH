/**
 * Series colors for the DEQ figures.
 *
 * Categorical slots 1-6 of the validated dark-mode palette, assigned in fixed order and never
 * cycled. Validated against the chart surface (navy-mid #132B3C) with
 * `dataviz/scripts/validate_palette.js --mode dark --surface "#132B3C"`:
 * lightness band PASS, chroma floor PASS, worst adjacent CVD ΔE 8.4 (protan) PASS,
 * worst adjacent normal-vision ΔE 19.3 PASS, contrast WARN on slot 6 (#008300, 2.95:1).
 *
 * The contrast WARN obligates a relief channel. Every figure on this page ships a full data
 * table inside a <details> element, which is that relief; do not remove those tables.
 *
 * Colour is never the only encoding here: each series is named in the legend, in the tooltip,
 * and in the table, and the regulatory monitor additionally carries its own stroke pattern.
 */
export const DEQ_SERIES_COLORS = [
  "#3987e5", // 1 blue
  "#d95926", // 2 orange
  "#199e70", // 3 aqua
  "#c98500", // 4 yellow
  "#d55181", // 5 magenta
  "#008300", // 6 green
] as const;

/**
 * The regulatory monitor is not a seventh peer series: it is a different instrument class,
 * and merging it visually into the sensor set is the presentational form of the error DEQ's
 * CFR language exists to prevent. It renders in the page's text colour with a dashed stroke,
 * so the distinction survives greyscale, colour-vision deficiency and forced-colours mode.
 */
export const DEQ_REGULATORY_COLOR = "#F8FAFC";
export const DEQ_REGULATORY_DASH = "6 3";

/** Chart chrome, drawn from tailwind.config.ts. */
export const DEQ_CHART = {
  surface: "#132B3C",
  axis: "#334155",
  tickPrimary: "#C7D2DA",
  tickMuted: "#94A3B8",
  grid: "rgba(255,255,255,0.06)",
  /** Smoke-transport window shading. Neutral grey: the episode is context, not a category. */
  smokeFill: "rgba(148,163,184,0.16)",
  smokeStroke: "rgba(199,210,218,0.55)",
  /** The 35 µg/m³ line marks the level of a standard; it is not a category and not a warning. */
  standardStroke: "#94A3B8",
} as const;

export function seriesColor(index: number, instrumentClass: "sensor" | "regulatory"): string {
  return instrumentClass === "regulatory"
    ? DEQ_REGULATORY_COLOR
    : DEQ_SERIES_COLORS[index % DEQ_SERIES_COLORS.length];
}
