"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SHAPItem {
  feature: string;
  mean_shap_value: number;
  direction: string;
}

interface SHAPSummaryChartProps {
  data: SHAPItem[];
  title?: string;
}

export function SHAPSummaryChart({
  data,
  title = "SHAP Feature Importance",
}: SHAPSummaryChartProps) {
  const sorted = [...data].sort(
    (a, b) => Math.abs(b.mean_shap_value) - Math.abs(a.mean_shap_value)
  );

  return (
    <div
      className="border border-white/[0.08] rounded-md p-4 bg-navy-mid/50"
      aria-label={`SHAP feature importance chart with ${sorted.length} features`}
    >
      <h3 className="text-sm font-semibold text-surface-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 40)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
        >
          <XAxis
            type="number"
            tick={{ fill: "#94A3B8", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis
            type="category"
            dataKey="feature"
            tick={{ fill: "#C7D2DA", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#132B3C",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px",
            }}
            labelStyle={{ color: "#F8FAFC" }}
            itemStyle={{ color: "#C7D2DA" }}
            formatter={(value: number) => [value.toFixed(3), "SHAP value"]}
          />
          <Bar dataKey="mean_shap_value" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.mean_shap_value >= 0 ? "#C53030" : "#2F855A"}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-cool-dark mt-3">
        Red bars indicate features associated with higher modeled burden; green
        bars indicate features associated with lower modeled burden. Model
        outputs are illustrative and do not represent individual-level
        predictions.
      </p>
    </div>
  );
}
