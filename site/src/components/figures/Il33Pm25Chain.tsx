import { FIGURE_COLORS, type FigureMeta, type FigureSize, type Il33ChainData, type EvidenceClass } from "@/lib/figures";

/**
 * C1: hand-authored SVG mechanistic chain, PM2.5 to asthma exacerbation.
 * Evidence-class tags sit under each arrow. Links without direct atlas evidence
 * are drawn dashed and tagged "inferred". Colors avoid red/green, which are
 * reserved for direction elsewhere in the figure set; the confidence chip is
 * neutral navy rather than the site's red/green ConfidenceBadge palette.
 */

const EVIDENCE_COLOR: Record<EvidenceClass, string> = {
  GWAS: FIGURE_COLORS.navy,
  eQTL: FIGURE_COLORS.navyMid,
  functional: FIGURE_COLORS.tealSoft,
  literature: FIGURE_COLORS.slateDark,
  inferred: FIGURE_COLORS.slateDark,
};

function wrapLabel(label: string): string[] {
  if (label.length <= 13) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [label];
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    const diff = Math.abs(left - right);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export function Il33Pm25Chain({
  size,
  data,
  meta,
}: {
  size: FigureSize;
  data: Il33ChainData;
  meta: FigureMeta;
}) {
  const NW = 150;
  const GAP = 52;
  const NH = 90;
  const NY = 44;
  const cx = NY + NH / 2; // vertical center of nodes
  const tagY = NY + NH + 24; // evidence tag sits below the node boxes
  const vbW = data.nodes.length * NW + (data.nodes.length - 1) * GAP;
  const vbH = 195;
  const nodeX = (i: number) => i * (NW + GAP);

  const legend: { cls: EvidenceClass; label: string }[] = [
    { cls: "literature", label: "literature" },
    { cls: "functional", label: "functional" },
    { cls: "GWAS", label: "GWAS" },
    { cls: "inferred", label: "inferred (dashed)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
        <div style={{ maxWidth: size === "square" ? 760 : 900 }}>
          <div style={{ fontSize: size === "square" ? 30 : 32, fontWeight: 700, lineHeight: 1.15, color: FIGURE_COLORS.navy }}>
            {meta.title}
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.4, color: FIGURE_COLORS.slateDark, marginTop: 8 }}>
            {meta.claim}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            border: `2px solid ${FIGURE_COLORS.navy}`,
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: FIGURE_COLORS.navy,
            whiteSpace: "nowrap",
          }}
        >
          {data.confidence.toUpperCase()} CONFIDENCE
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center" }}>
        <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" style={{ maxHeight: "100%" }} role="img" aria-label={meta.altText}>
          <defs>
            <marker id="c1-arrow-navy" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill={FIGURE_COLORS.navy} />
            </marker>
            <marker id="c1-arrow-slate" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 z" fill={FIGURE_COLORS.slateDark} />
            </marker>
          </defs>

          {data.edges.map((edge, i) => {
            const x1 = nodeX(i) + NW;
            const x2 = nodeX(i + 1);
            const midX = (x1 + x2) / 2;
            const inferred = edge.evidenceClass === "inferred";
            return (
              <g key={`edge-${i}`}>
                <line
                  x1={x1 + 2}
                  y1={cx}
                  x2={x2 - 6}
                  y2={cx}
                  stroke={inferred ? FIGURE_COLORS.slateDark : FIGURE_COLORS.navy}
                  strokeWidth={2}
                  strokeDasharray={inferred ? "6 5" : undefined}
                  markerEnd={`url(#${inferred ? "c1-arrow-slate" : "c1-arrow-navy"})`}
                />
                <text
                  x={midX}
                  y={tagY}
                  textAnchor="middle"
                  fontSize={13}
                  fontStyle={inferred ? "italic" : "normal"}
                  fontWeight={600}
                  fill={EVIDENCE_COLOR[edge.evidenceClass]}
                >
                  {edge.evidenceClass}
                </text>
              </g>
            );
          })}

          {data.nodes.map((label, i) => {
            const lines = wrapLabel(label);
            const x = nodeX(i);
            return (
              <g key={`node-${i}`}>
                <rect x={x} y={NY} width={NW} height={NH} rx={12} fill={FIGURE_COLORS.white} stroke={FIGURE_COLORS.navy} strokeWidth={2} />
                <text x={x + NW / 2} y={cx} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={600} fill={FIGURE_COLORS.navy}>
                  {lines.map((ln, li) => (
                    <tspan key={li} x={x + NW / 2} dy={li === 0 ? (lines.length > 1 ? "-0.55em" : "0") : "1.1em"}>
                      {ln}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: FIGURE_COLORS.slateDark }}>
        <span style={{ fontWeight: 700, color: FIGURE_COLORS.navy }}>Evidence class</span>
        {legend.map((l) => (
          <span key={l.cls} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 22, height: 0, borderTop: `3px ${l.cls === "inferred" ? "dashed" : "solid"} ${EVIDENCE_COLOR[l.cls]}` }} />
            <span style={{ color: EVIDENCE_COLOR[l.cls], fontWeight: 600 }}>{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
