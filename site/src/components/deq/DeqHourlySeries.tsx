"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { HourlySeriesPayload } from "@/lib/deq-data";
import { DEQ_CHART, DEQ_REGULATORY_DASH, seriesColor } from "./palette";

/**
 * Timestamps in the DEQ tables are EST wall-clock strings, already normalised to hour-beginning
 * by the pipeline. Parsing them as UTC and formatting them back in UTC preserves the wall-clock
 * value exactly; parsing them in the viewer's zone would shift every point by that viewer's
 * offset. This is the same pinning `formatRegionDate` applies on the community pages.
 */
const toMs = (ts: string): number => Date.parse(`${ts.replace(" ", "T")}Z`);

const fmtDay = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const fmtHour = (ms: number): string =>
  new Date(ms).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", hour12: true, timeZone: "UTC",
  });

interface Row { t: number; [key: string]: number | null }

export interface DeqHourlySeriesProps {
  payload: HourlySeriesPayload;
  standardLevel: number;
}

type RangeKey = "full" | "smoke";

export function DeqHourlySeries({ payload, standardLevel }: DeqHourlySeriesProps) {
  const [range, setRange] = useState<RangeKey>("full");

  const allRows = useMemo<Row[]>(() => {
    return payload.hours.map((h, i) => {
      const row: Row = { t: toMs(h) };
      for (const s of payload.series) row[s.key] = s.values[i];
      return row;
    });
  }, [payload]);

  const smokeStart = toMs(payload.smokeFrom);
  const smokeEnd = toMs(payload.smokeTo);
  const DAY = 86_400_000;

  const rows = useMemo(() => {
    if (range === "full") return allRows;
    const from = smokeStart - 2 * DAY;
    const to = smokeEnd + 2 * DAY;
    return allRows.filter((r) => r.t >= from && r.t <= to);
  }, [allRows, range, smokeStart, smokeEnd]);

  return (
    <div className="min-w-[320px]">
      <fieldset className="mb-3 flex flex-wrap items-center gap-3">
        <legend className="sr-only">Time range</legend>
        {([
          ["full", "Full record"],
          ["smoke", "Smoke-transport window, Jul 14 to 21"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-1.5 text-xs">
            <input
              type="radio"
              name="deq-hourly-range"
              value={key}
              checked={range === key}
              onChange={() => setRange(key)}
              className="border-white/[0.06]"
            />
            <span className={range === key ? "text-surface-white" : "text-cool-mid"}>{label}</span>
          </label>
        ))}
      </fieldset>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={rows} margin={{ top: 28, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={DEQ_CHART.grid} vertical={false} />

          {/* Shaded inside the plot area, not annotated in a caption below it: an unlabelled
              282.5 µg/m³ hour on a page about a data centre corridor invites exactly the
              inference this window rules out. The smoke originated roughly 1,500 miles away. */}
          <ReferenceArea
            x1={smokeStart}
            x2={smokeEnd}
            fill={DEQ_CHART.smokeFill}
            stroke={DEQ_CHART.smokeStroke}
            strokeDasharray="3 3"
            ifOverflow="extendDomain"
            label={{
              value: "Wildfire smoke transport, Minnesota and Canada (DEQ qualifier IF)",
              position: "insideTop",
              fill: DEQ_CHART.tickPrimary,
              fontSize: 10,
            }}
          />

          <ReferenceLine
            y={standardLevel}
            stroke={DEQ_CHART.standardStroke}
            strokeDasharray="4 4"
            label={{
              value: `${standardLevel} µg/m³ — level of the 24-hour standard`,
              position: "insideBottomRight",
              fill: DEQ_CHART.tickMuted,
              fontSize: 10,
            }}
          />

          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={fmtDay}
            tick={{ fill: DEQ_CHART.tickMuted, fontSize: 10 }}
            axisLine={{ stroke: DEQ_CHART.axis }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: DEQ_CHART.tickMuted, fontSize: 10 }}
            axisLine={{ stroke: DEQ_CHART.axis }}
            tickLine={false}
            width={44}
            label={{
              value: "PM2.5 (µg/m³)",
              angle: -90,
              position: "insideLeft",
              fill: DEQ_CHART.tickMuted,
              fontSize: 10,
              style: { textAnchor: "middle" },
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: DEQ_CHART.surface,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
              fontSize: "11px",
            }}
            labelStyle={{ color: "#F8FAFC" }}
            itemStyle={{ color: "#C7D2DA" }}
            labelFormatter={(v) => fmtHour(Number(v))}
            formatter={(value: number | string, name: string) => [
              `${Number(value).toFixed(2)} µg/m³`, name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#C7D2DA", paddingTop: "8px" }}
            iconSize={10}
          />

          {payload.series.map((s, i) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={seriesColor(i, s.instrumentClass)}
              strokeWidth={s.instrumentClass === "regulatory" ? 2 : 1.25}
              strokeDasharray={
                s.instrumentClass === "regulatory" ? DEQ_REGULATORY_DASH : undefined
              }
              dot={false}
              activeDot={{ r: 3 }}
              /* Gaps stay gaps. Voided hours, the spring-forward hour that does not exist in
                 local time, and readings excluded under the DEQ rule are all null, and joining
                 across them would draw a measurement that was never taken. */
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
