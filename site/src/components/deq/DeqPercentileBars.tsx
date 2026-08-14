"use client";

import {
  Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import type { PercentileRow } from "@/lib/deq-data";
import { DEQ_CHART, DEQ_SERIES_COLORS } from "./palette";

export interface DeqPercentileBarsProps {
  rows: PercentileRow[];
  standardLevel: number;
}

/**
 * Full-record against common-window 98th percentile, one pair of bars per site.
 *
 * Horizontal because the category labels are site identifiers rather than short names, and a
 * vertical arrangement collides them at 380px. The two bars are a categorical pair, not a ramp:
 * neither window is "more" than the other, and colouring them by value would re-encode the bar
 * length in hue.
 */
export function DeqPercentileBars({ rows, standardLevel }: DeqPercentileBarsProps) {
  const data = rows.map((r) => ({
    label: r.label,
    full: Number(r.fullP98.toFixed(2)),
    common: Number(r.commonP98.toFixed(2)),
    fullDays: r.fullDays,
    commonDays: r.commonDays,
  }));

  return (
    <div className="min-w-[320px]">
      <ResponsiveContainer width="100%" height={Math.max(280, rows.length * 62)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          barGap={2}
          barCategoryGap="22%"
        >
          <CartesianGrid stroke={DEQ_CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: DEQ_CHART.tickMuted, fontSize: 10 }}
            axisLine={{ stroke: DEQ_CHART.axis }}
            tickLine={false}
            label={{
              value: "98th percentile of daily PM2.5 averages (µg/m³)",
              position: "insideBottom",
              offset: -2,
              fill: DEQ_CHART.tickMuted,
              fontSize: 10,
            }}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: DEQ_CHART.tickPrimary, fontSize: 10 }}
            axisLine={{ stroke: DEQ_CHART.axis }}
            tickLine={false}
            width={168}
          />

          <ReferenceLine
            x={standardLevel}
            stroke={DEQ_CHART.standardStroke}
            strokeDasharray="4 4"
            label={{
              value: `${standardLevel} µg/m³`,
              position: "top",
              fill: DEQ_CHART.tickMuted,
              fontSize: 10,
            }}
          />

          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              backgroundColor: DEQ_CHART.surface,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
              fontSize: "11px",
            }}
            labelStyle={{ color: "#F8FAFC" }}
            itemStyle={{ color: "#C7D2DA" }}
            formatter={(value: number | string, name: string) => [
              `${Number(value).toFixed(2)} µg/m³`, name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#C7D2DA", paddingTop: "8px" }}
            iconSize={10}
          />

          <Bar
            dataKey="full"
            name="Own record, each site to its own length"
            fill={DEQ_SERIES_COLORS[0]}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="common"
            name="Common window, Jun 18 to Aug 7"
            fill={DEQ_SERIES_COLORS[1]}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
