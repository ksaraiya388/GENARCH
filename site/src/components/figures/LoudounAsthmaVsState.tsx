"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { FIGURE_COLORS, type FigureMeta, type FigureSize, type LoudounPrevalenceData } from "@/lib/figures";

/**
 * C2: adult asthma prevalence, Loudoun vs Virginia vs US. Loudoun is navy, the
 * comparators are slate. Prevalence is a magnitude, not a direction, so red is
 * deliberately not used. No error bars, because the prevalence record carries no
 * confidence interval. Values come from the community dataset (BRFSS 2023).
 */
export function LoudounAsthmaVsState({
  size,
  data,
  meta,
}: {
  size: FigureSize;
  data: LoudounPrevalenceData;
  meta: FigureMeta;
}) {
  const rows = [
    { name: "Loudoun County", value: data.region, fill: FIGURE_COLORS.navy },
    ...(data.state !== null
      ? [{ name: "Virginia", value: data.state, fill: FIGURE_COLORS.slate }]
      : []),
    ...(data.national !== null
      ? [{ name: "United States", value: data.national, fill: FIGURE_COLORS.slate }]
      : []),
  ].map((r) => ({ ...r, label: `${r.value.toFixed(1)}%` }));

  const max = Math.max(...rows.map((r) => r.value));
  const yMax = Math.ceil(max + 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
      <div>
        <div style={{ fontSize: size === "square" ? 30 : 32, fontWeight: 700, lineHeight: 1.15, color: FIGURE_COLORS.navy }}>
          {meta.title}
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.4, color: FIGURE_COLORS.slateDark, marginTop: 8 }}>
          {meta.claim}
        </div>
        <div style={{ fontSize: 14, color: FIGURE_COLORS.slate, marginTop: 6 }}>
          Adults, {data.year}. Share ever diagnosed with asthma.
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 28, right: 24, left: 12, bottom: 8 }}>
            <CartesianGrid vertical={false} stroke="rgba(11,31,47,0.10)" />
            <XAxis
              dataKey="name"
              tick={{ fill: FIGURE_COLORS.navy, fontSize: 17, fontWeight: 600 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(11,31,47,0.25)" }}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fill: FIGURE_COLORS.slateDark, fontSize: 14 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
              label={{
                value: "% of adults",
                angle: -90,
                position: "insideLeft",
                fill: FIGURE_COLORS.slateDark,
                fontSize: 14,
                style: { textAnchor: "middle" },
              }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={150}>
              {rows.map((r) => (
                <Cell key={r.name} fill={r.fill} />
              ))}
              <LabelList dataKey="label" position="top" fill={FIGURE_COLORS.navy} fontSize={22} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
