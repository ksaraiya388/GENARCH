import { FIGURE_COLORS, type FigureMeta, type FigureSize, type GraphHeroData } from "@/lib/figures";

/**
 * C5: hero shot of the GENARCH knowledge graph. Positions are read from the
 * committed deterministic layout (data/figures/hero_layout.json), never a live
 * simulation, so the render is byte-stable. Node colors match the live /graph
 * node-type palette; edge colors use the direction tokens (amplify red, buffer
 * green, unknown gray). Only the highest-degree nodes are labeled.
 */

// Node-type palette, matching GraphPageClient.tsx so the hero looks like the
// real graph page.
const NODE_COLOR: Record<string, string> = {
  disease: "#F2766A",
  exposure: "#F39C6B",
  gene: "#89E5E6",
  variant: "#D3B3D3",
  pathway: "#F5C75A",
  tissue: "#EFE789",
};

const DIRECTION_COLOR: Record<string, string> = {
  amplify: FIGURE_COLORS.amplify,
  buffer: FIGURE_COLORS.buffer,
  unknown: FIGURE_COLORS.unknown,
  bidirectional: FIGURE_COLORS.unknown,
};

const NODE_TYPES = ["disease", "gene", "exposure", "pathway", "tissue", "variant"];
const DIRECTIONS: { key: string; label: string }[] = [
  { key: "amplify", label: "amplify" },
  { key: "buffer", label: "buffer" },
  { key: "unknown", label: "unknown" },
];

export function KnowledgeGraphHero({
  size,
  data,
  meta,
}: {
  size: FigureSize;
  data: GraphHeroData;
  meta: FigureMeta;
}) {
  const vbW = 1000;
  const vbH = size === "square" ? 860 : 520;
  const posOf = new Map(data.nodes.map((n) => [n.id, n]));
  const radius = (deg: number) => Math.min(26, 9 + deg * 1.1);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 10 }}>
      <div>
        <div style={{ fontSize: size === "square" ? 30 : 32, fontWeight: 700, lineHeight: 1.15, color: FIGURE_COLORS.navy }}>
          {meta.title}
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.4, color: FIGURE_COLORS.slateDark, marginTop: 8 }}>
          {meta.claim}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: FIGURE_COLORS.navy,
          borderRadius: 16,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={meta.altText}>
            {data.edges.map((e, i) => {
              const s = posOf.get(e.source);
              const t = posOf.get(e.target);
              if (!s || !t) return null;
              return (
                <line
                  key={`e-${i}`}
                  x1={s.x * vbW}
                  y1={s.y * vbH}
                  x2={t.x * vbW}
                  y2={t.y * vbH}
                  stroke={DIRECTION_COLOR[e.direction] ?? FIGURE_COLORS.unknown}
                  strokeWidth={1 + e.strength * 2.5}
                  strokeOpacity={0.2 + e.strength * 0.5}
                />
              );
            })}
            {data.nodes.map((n) => (
              <circle
                key={`n-${n.id}`}
                cx={n.x * vbW}
                cy={n.y * vbH}
                r={radius(n.degree)}
                fill={NODE_COLOR[n.type] ?? FIGURE_COLORS.slate}
                stroke={FIGURE_COLORS.navy}
                strokeWidth={2}
              />
            ))}
            {data.nodes
              .filter((n) => n.labeled)
              .map((n) => (
                <text
                  key={`l-${n.id}`}
                  x={n.x * vbW + radius(n.degree) + 6}
                  y={n.y * vbH + 5}
                  fontSize={18}
                  fontWeight={600}
                  fill={FIGURE_COLORS.white}
                >
                  {n.label}
                </text>
              ))}
          </svg>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", alignItems: "center", fontSize: 13, color: "#C7D2DA" }}>
          {NODE_TYPES.map((t) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: NODE_COLOR[t] }} />
              {t}
            </span>
          ))}
          <span style={{ width: 1, height: 14, background: "rgba(199,210,218,0.3)" }} />
          {DIRECTIONS.map((d) => (
            <span key={d.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 18, height: 0, borderTop: `3px solid ${DIRECTION_COLOR[d.key]}` }} />
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
