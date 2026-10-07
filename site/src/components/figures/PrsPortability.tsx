import {
  FIGURE_COLORS,
  type FigureMeta,
  type FigureSize,
  type PrsPortabilityData,
} from "@/lib/figures";
import { BarRows } from "./BarRows";

/**
 * Incremental AUC of one multi-ancestry type 2 diabetes polygenic score across the
 * five ancestry groups the study validated in.
 *
 * Every bar is the same metric, the same trait, the same score and the same study
 * (Huerta-Chagoya et al. 2026). That is the whole reason this figure can exist as a
 * chart rather than a table: numbers from different studies or different metrics would
 * not share a scale, and putting them on one axis would imply a comparison the
 * literature does not support.
 *
 * European is the emphasis bar because it is the reference the other four are read
 * against, not because it is the largest.
 */
export function PrsPortability({
  size,
  data,
  meta,
}: {
  size: FigureSize;
  data: PrsPortabilityData;
  meta: FigureMeta;
}) {
  const rows = data.rows.map((r) => ({
    label: r.population,
    sublabel: `study label: ${r.labelAsUsed}`,
    value: r.value,
    display: r.value.toFixed(3),
    emphasis: r.population === "European ancestry",
  }));

  // Axis top is the next 0.05 above the largest bar, so the bars fill the frame
  // without the longest one touching the value label.
  const max = Math.ceil((Math.max(...data.rows.map((r) => r.value)) * 1.08) / 0.05) * 0.05;

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
          Metric: {data.metric}. One study, one score. Higher is more accurate.
          Population-level validation cohorts.
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <BarRows
          rows={rows}
          max={max}
          width={size === "square" ? 940 : 1060}
          barHeight={size === "square" ? 74 : 62}
          gap={size === "square" ? 22 : 18}
          labelWidth={size === "square" ? 400 : 430}
          labelFontSize={17}
          sublabelFontSize={13}
          valueFontSize={22}
          colors={{
            bar: FIGURE_COLORS.tealSoft,
            barEmphasis: FIGURE_COLORS.navy,
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
