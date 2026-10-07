import {
  FIGURE_COLORS,
  type FigureMeta,
  type FigureSize,
  type GwasAncestryData,
} from "@/lib/figures";
import { BarRows } from "./BarRows";

/**
 * C3: share of GWAS participants by ancestry group, from ONE snapshot.
 *
 * No world-population comparison bar. The matched world-population share by the same
 * ancestry framework is not published by either source, and attaching a
 * differently-defined population figure would make the two bars measure different
 * things. See the comment above FIGURES in lib/figures.ts.
 *
 * European is drawn in slate and the remaining group in teal, so the eye lands on the
 * smaller share rather than the larger one. The subtitle states that the snapshot's
 * "Asian" category is not South Asian-specific, because that is the single most
 * likely misreading of this chart on a page about South Asian ancestry.
 */
export function GwasAncestryImbalance({
  size,
  data,
  meta,
}: {
  size: FigureSize;
  data: GwasAncestryData;
  meta: FigureMeta;
}) {
  const rows = data.rows.map((r) => ({
    label: `${r.group} ancestry`,
    value: r.pct,
    display: `${r.pct}%`,
    emphasis: r.group !== "European",
  }));

  const hasAsian = data.rows.some((r) => r.group === "Asian");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            fontSize: size === "square" ? 30 : 32,
            fontWeight: 700,
            lineHeight: 1.15,
            color: FIGURE_COLORS.navy,
          }}
        >
          {meta.title}
        </div>
        <div
          style={{
            fontSize: 17,
            lineHeight: 1.4,
            color: FIGURE_COLORS.slateDark,
            marginTop: 8,
          }}
        >
          {meta.claim}
        </div>
        <div style={{ fontSize: 14, color: FIGURE_COLORS.slate, marginTop: 6 }}>
          Share of GWAS participants, {data.asOf} snapshot.
          {hasAsian
            ? " “Asian” in this snapshot is not South Asian-specific."
            : ""}{" "}
          Groups the snapshot does not itemise are not plotted.
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <BarRows
          rows={rows}
          max={100}
          width={size === "square" ? 940 : 1060}
          barHeight={size === "square" ? 96 : 84}
          gap={size === "square" ? 36 : 28}
          labelWidth={size === "square" ? 300 : 320}
          labelFontSize={20}
          valueFontSize={26}
          colors={{
            bar: FIGURE_COLORS.slate,
            barEmphasis: FIGURE_COLORS.tealSoft,
            track: "rgba(11,31,47,0.08)",
            label: FIGURE_COLORS.navy,
            sublabel: FIGURE_COLORS.slate,
            value: FIGURE_COLORS.navy,
          }}
        />
      </div>
    </div>
  );
}
