"use client";

import { FigureExportButtons } from "@/components/charts/FigureExportButtons";
import type { Disease } from "@/lib/types";

interface TissueRelevanceHeatmapProps {
  disease: Disease;
}

function colorFromScore(score: number): string {
  const clamped = Math.max(0, Math.min(1, score));
  const alpha = 0.2 + clamped * 0.6;
  return `rgba(137, 229, 230, ${alpha.toFixed(2)})`;
}

export function TissueRelevanceHeatmap({ disease }: TissueRelevanceHeatmapProps): JSX.Element {
  const chartId = `tissue-heatmap-${disease.slug}`;
  const rowHeight = 40;
  const width = 720;
  const height = Math.max(120, disease.tissue_relevance_matrix.length * rowHeight + 50);
  return (
    <section className="content-card">
      <h2 className="section-title">Tissue relevance matrix</h2>
      <p className="mt-1 text-sm text-textSecondary">
        Tooltips include evidence type and confidence tier.
      </p>
      <div id={chartId} className="mt-4 overflow-x-auto rounded border border-slate-200 bg-white p-2">
        <svg width={width} height={height} role="img" aria-label="Tissue relevance heatmap">
          <text x={20} y={24} fontSize={12} fill="#666666">
            Tissue
          </text>
          <text x={270} y={24} fontSize={12} fill="#666666">
            Context
          </text>
          <text x={430} y={24} fontSize={12} fill="#666666">
            Relevance score
          </text>
          {disease.tissue_relevance_matrix.map((cell, index) => {
            const y = 36 + index * rowHeight;
            return (
              <g key={`${cell.tissue}-${cell.context}`}>
                <text x={20} y={y + 24} fontSize={13} fill="#333333">
                  {cell.tissue}
                </text>
                <text x={270} y={y + 24} fontSize={13} fill="#333333">
                  {cell.context}
                </text>
                <rect
                  x={430}
                  y={y}
                  width={220}
                  height={30}
                  fill={colorFromScore(cell.score)}
                  stroke="#d1d5db"
                  strokeWidth={1}
                >
                  <title>
                    {`${cell.score.toFixed(2)} (${cell.evidence_type}, ${cell.confidence}) citations: ${cell.citations.join(", ")}`}
                  </title>
                </rect>
                <text x={535} y={y + 21} textAnchor="middle" fontSize={12} fill="#333333">
                  {cell.score.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <FigureExportButtons
        svgContainerId={chartId}
        filenameBase={`${disease.slug}-tissue-relevance`}
      />
    </section>
  );
}
