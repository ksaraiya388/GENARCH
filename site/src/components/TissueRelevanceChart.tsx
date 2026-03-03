"use client";

import { useRef, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { toPng, toSvg } from "html-to-image";
import { saveAs } from "file-saver";

interface TissueEntry {
  name: string;
  relevance_score: number;
  evidence_type?: string;
}

interface TissueRelevanceChartProps {
  diseaseName: string;
  tissues: TissueEntry[];
}

const VIRIDIS_SCALE = ["#440154", "#31688e", "#35b779", "#fde725"];

function getColor(score: number): string {
  const idx = Math.min(
    Math.floor(score * VIRIDIS_SCALE.length),
    VIRIDIS_SCALE.length - 1
  );
  return VIRIDIS_SCALE[idx];
}

export function TissueRelevanceChart({
  diseaseName,
  tissues,
}: TissueRelevanceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const data = tissues
    .slice()
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .map((t) => ({
      name: t.name,
      score: t.relevance_score,
      evidence: t.evidence_type ?? "curated",
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
          saveAs(dataUrl, `genarch-tissue-relevance-${diseaseName}.png`);
        } else {
          const blob = new Blob([dataUrl], { type: "image/svg+xml" });
          saveAs(blob, `genarch-tissue-relevance-${diseaseName}.svg`);
        }
      } catch {
        /* download failed silently */
      }
    },
    [diseaseName]
  );

  if (tissues.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-h3 text-surface-white">Tissue Relevance</h3>
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
      <div ref={chartRef} className="bg-navy-mid p-4 rounded-sm border border-white/[0.06]">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              type="number"
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              label={{
                value: "Relevance Score",
                position: "insideBottom",
                offset: -2,
                style: { fontSize: 11, fill: "#94A3B8" },
              }}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12, fill: "#C7D2DA" }}
              width={110}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 2,
                backgroundColor: "#132B3C",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#F8FAFC",
              }}
              formatter={(value: number) => [
                value.toFixed(2),
                "Relevance",
              ]}
            />
            <Bar dataKey="score" name="Relevance">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
