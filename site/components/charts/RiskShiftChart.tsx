"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { FigureExportButtons } from "@/components/charts/FigureExportButtons";
import type { Disease } from "@/lib/types";

interface RiskShiftChartProps {
  disease: Disease;
}

export function RiskShiftChart({ disease }: RiskShiftChartProps): JSX.Element {
  const chartId = `risk-shift-${disease.slug}`;
  const data = disease.risk_shift_data.map((point) => ({
    ...point,
    error: [point.liability_shift - point.confidence_low, point.confidence_high - point.liability_shift]
  }));

  return (
    <section className="content-card">
      <h2 className="section-title">Risk shift by exposure stratum</h2>
      <p className="mt-1 text-sm text-textSecondary">
        Population-level data only — does not predict individual risk.
      </p>
      <div id={chartId} className="mt-4 h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 16, bottom: 16, left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stratum" />
            <YAxis />
            <Tooltip
              formatter={(value: number, _name, payload) => [
                `${Number(value).toFixed(2)}`,
                `Liability shift (${String(payload?.payload?.evidence_type)} / ${String(payload?.payload?.confidence)})`
              ]}
            />
            <Bar dataKey="liability_shift" fill="#89E5E6" name="Liability shift">
              <ErrorBar dataKey="error" direction="y" width={4} strokeWidth={1.5} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <FigureExportButtons svgContainerId={chartId} filenameBase={`${disease.slug}-risk-shift`} />
    </section>
  );
}
