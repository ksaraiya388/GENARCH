"use client";

import { useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toPng, toSvg } from "html-to-image";
import { saveAs } from "file-saver";

interface ExposureModifier {
  exposure_slug: string;
  direction: string;
  strength: number;
  confidence: string;
  mechanism_hypothesis?: string;
}

interface RiskShiftChartProps {
  diseaseName: string;
  modifiers: ExposureModifier[];
}

export function RiskShiftChart({ diseaseName, modifiers }: RiskShiftChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const data = modifiers.map((m) => ({
    name: m.exposure_slug.replace(/-/g, " "),
    low: m.direction === "amplify" ? 1.0 : m.direction === "buffer" ? 1.0 : 1.0,
    medium:
      m.direction === "amplify"
        ? 1.0 + m.strength * 0.3
        : m.direction === "buffer"
        ? 1.0 - m.strength * 0.2
        : 1.0,
    high:
      m.direction === "amplify"
        ? 1.0 + m.strength * 0.6
        : m.direction === "buffer"
        ? 1.0 - m.strength * 0.4
        : 1.0,
    direction: m.direction,
    confidence: m.confidence,
  }));

  const handleDownload = useCallback(
    async (format: "png" | "svg") => {
      if (!chartRef.current) return;
      try {
        const fn = format === "png" ? toPng : toSvg;
        const dataUrl = await fn(chartRef.current, {
          backgroundColor: "#0B1F2F",
        });
        if (format === "png") {
          saveAs(dataUrl, `genarch-risk-shift-${diseaseName}.png`);
        } else {
          const blob = new Blob([dataUrl], { type: "image/svg+xml" });
          saveAs(blob, `genarch-risk-shift-${diseaseName}.svg`);
        }
      } catch {
        /* download failed silently */
      }
    },
    [diseaseName]
  );

  if (modifiers.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-surface-white">
          Risk Shift by Exposure Stratum
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleDownload("png")}
            className="text-xs px-3 py-1 border border-white/[0.06] rounded-sm text-cool-light hover:bg-white/[0.04]"
            aria-label="Download chart as PNG"
          >
            PNG
          </button>
          <button
            onClick={() => handleDownload("svg")}
            className="text-xs px-3 py-1 border border-white/[0.06] rounded-sm text-cool-light hover:bg-white/[0.04]"
            aria-label="Download chart as SVG"
          >
            SVG
          </button>
        </div>
      </div>
      <p className="text-xs text-amber-400 bg-amber-900/20 px-3 py-1 rounded-sm inline-block">
        Population-level data only — does not predict individual risk
      </p>
      <div ref={chartRef} className="bg-navy-mid p-4 rounded-sm border border-white/[0.06]">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              tickLine={false}
            />
            <YAxis
              label={{
                value: "Pop. genetic liability (relative)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#94A3B8" },
              }}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              domain={[0.5, 1.8]}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 2,
                backgroundColor: "#132B3C",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F8FAFC",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                `${name} exposure stratum`,
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#C7D2DA" }} />
            <Bar dataKey="low" fill="#177A6F" name="Low exposure" />
            <Bar dataKey="medium" fill="#1FAFA0" name="Medium exposure" />
            <Bar dataKey="high" fill="#2DD4BF" name="High exposure" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
