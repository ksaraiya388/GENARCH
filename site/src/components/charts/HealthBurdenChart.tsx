"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HealthStat {
  condition: string;
  region_value: number;
  state_value?: number;
  national_value?: number;
  unit?: string;
}

interface HealthBurdenChartProps {
  data: HealthStat[];
  regionName: string;
  title?: string;
}

export function HealthBurdenChart({
  data,
  regionName,
  title = "Health Burden Comparison",
}: HealthBurdenChartProps) {
  return (
    <div
      className="border border-white/[0.08] rounded-md p-4 bg-navy-mid/50"
      aria-label={`Health burden comparison chart for ${regionName}`}
    >
      <h3 className="text-sm font-semibold text-surface-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis
            dataKey="condition"
            tick={{ fill: "#C7D2DA", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#132B3C",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
            }}
            labelStyle={{ color: "#F8FAFC" }}
            itemStyle={{ color: "#C7D2DA" }}
          />
          <Legend wrapperStyle={{ color: "#C7D2DA", fontSize: "12px" }} />
          <Bar
            dataKey="region_value"
            name={regionName}
            fill="#2DD4BF"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="state_value"
            name="State Avg"
            fill="#64748B"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="national_value"
            name="National Avg"
            fill="#334155"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-cool-dark mt-3">
        Population-level prevalence estimates. Sources: CDC PLACES, state health
        departments. Not individual risk indicators.
      </p>
    </div>
  );
}
