import type { ReactNode } from "react";
import { FIGURE_SIZES, FIGURE_COLORS, type FigureMeta, type FigureSize } from "@/lib/figures";

interface FigureFrameProps {
  size: FigureSize;
  meta: FigureMeta;
  children: ReactNode;
}

/**
 * Branded wrapper every exportable figure renders inside. Fixed pixel
 * dimensions, light-gray background, GENARCH wordmark, a three-line source
 * bar, and a teal bottom rule. The [data-figure-root] attribute is the element
 * the export script screenshots, so the surrounding page chrome never appears
 * in the exported PNG. No animations or transitions, for byte-stable output.
 */
export function FigureFrame({ size, meta, children }: FigureFrameProps) {
  const { w, h } = FIGURE_SIZES[size];

  return (
    <div
      data-figure-root
      data-figure-id={meta.id}
      data-figure-size={size}
      data-figure-title={meta.title}
      data-figure-claim={meta.claim}
      data-figure-source={meta.sourceLine}
      data-figure-destination={meta.destination}
      data-figure-alt={meta.altText}
      style={{
        width: w,
        height: h,
        backgroundColor: FIGURE_COLORS.lightGray,
        color: FIGURE_COLORS.navy,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ padding: "40px 64px 0" }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: FIGURE_COLORS.navy,
          }}
        >
          GENARCH
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          padding: "24px 64px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>

      <div style={{ padding: "0 64px 20px" }}>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: FIGURE_COLORS.slateDark }}>
          <div>{meta.sourceLine}</div>
          <div>
            genarch.org
            <span style={{ color: FIGURE_COLORS.tealSoft }}>{meta.destination}</span>
          </div>
          <div>Educational only. Not medical advice. Not a diagnostic tool.</div>
        </div>
      </div>

      <div style={{ height: 4, width: "100%", backgroundColor: FIGURE_COLORS.teal }} />
    </div>
  );
}
