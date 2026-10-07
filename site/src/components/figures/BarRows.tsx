/**
 * Horizontal SVG bar rows. No charting library and no client JavaScript: the
 * cross-ancestry charts render identically in the light figure frame (for PNG export)
 * and on the dark /ancestry-equity page, so the two cannot drift apart.
 *
 * Horizontal rather than vertical because the category labels are ancestry-group
 * names ("Hispanic/Latino and Admixed American ancestry"), which do not fit under a
 * vertical axis tick without truncation. A truncated population label is exactly the
 * kind of thing the population-descriptor policy exists to prevent.
 *
 * `display` is the pre-formatted value string. The caller formats it, because
 * percentages, AUC gains and ratios each round differently and the component has no
 * business guessing which it has been handed.
 */

export interface BarRow {
  label: string;
  /** Secondary line under the label, e.g. the label the source study used. */
  sublabel?: string;
  value: number;
  /** Pre-formatted value, drawn at the end of the bar. */
  display: string;
  /** Draws the bar in the emphasis colour. Used for the comparator row. */
  emphasis?: boolean;
}

export interface BarRowsColors {
  bar: string;
  barEmphasis: string;
  track: string;
  label: string;
  sublabel: string;
  value: string;
}

export function BarRows({
  rows,
  max,
  width,
  barHeight,
  gap,
  labelWidth,
  colors,
  labelFontSize = 16,
  sublabelFontSize = 13,
  valueFontSize = 18,
}: {
  rows: BarRow[];
  /** Upper bound of the value axis. Bars are drawn as value/max of the track. */
  max: number;
  width: number;
  barHeight: number;
  gap: number;
  labelWidth: number;
  colors: BarRowsColors;
  labelFontSize?: number;
  sublabelFontSize?: number;
  valueFontSize?: number;
}) {
  const rowHeight = barHeight + gap;
  const height = rows.length * rowHeight - gap;
  // Sized from the longest value string rather than fixed: a six-character value
  // like "94.48%" at a large font overflowed a constant gutter and was clipped at
  // the frame edge. 0.62em per character is a safe overestimate for tabular digits
  // in the bold weight these are drawn at.
  const longestValue = rows.reduce((n, r) => Math.max(n, r.display.length), 0);
  const valueGutter = Math.max(92, Math.ceil(longestValue * valueFontSize * 0.62) + 20);
  const trackWidth = Math.max(10, width - labelWidth - valueGutter);

  return (
    // Scales to fit its container rather than asserting a pixel height. The figure
    // frame is a fixed-size box with a header and a source bar, so a fixed-height
    // SVG overflowed at both ends: the first row's label collided with the subtitle
    // and the last bar sat on top of the source line. preserveAspectRatio keeps the
    // bars proportional while the box decides the size.
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-hidden="true"
      style={{ display: "block", maxHeight: "100%" }}
    >
      {rows.map((row, i) => {
        const y = i * rowHeight;
        const frac = max > 0 ? Math.min(1, Math.max(0, row.value / max)) : 0;
        const barWidth = Math.max(1, frac * trackWidth);
        const hasSub = Boolean(row.sublabel);
        return (
          <g key={row.label}>
            <text
              x={0}
              y={hasSub ? y + barHeight / 2 - 3 : y + barHeight / 2 + labelFontSize / 3}
              fontSize={labelFontSize}
              fontWeight={600}
              fill={colors.label}
            >
              {row.label}
            </text>
            {hasSub && (
              <text
                x={0}
                y={y + barHeight / 2 + sublabelFontSize + 1}
                fontSize={sublabelFontSize}
                fill={colors.sublabel}
              >
                {row.sublabel}
              </text>
            )}
            <rect
              x={labelWidth}
              y={y + barHeight * 0.15}
              width={trackWidth}
              height={barHeight * 0.7}
              rx={3}
              fill={colors.track}
            />
            <rect
              x={labelWidth}
              y={y + barHeight * 0.15}
              width={barWidth}
              height={barHeight * 0.7}
              rx={3}
              fill={row.emphasis ? colors.barEmphasis : colors.bar}
            />
            <text
              x={labelWidth + trackWidth + 12}
              y={y + barHeight / 2 + valueFontSize / 3}
              fontSize={valueFontSize}
              fontWeight={700}
              fill={colors.value}
            >
              {row.display}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
