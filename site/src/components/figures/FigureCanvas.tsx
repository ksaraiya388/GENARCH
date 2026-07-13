"use client";

import { useSearchParams } from "next/navigation";
import { FIGURES, type FigurePayload, type FigureSize } from "@/lib/figures";
import { FigureFrame } from "./FigureFrame";
import { Il33Pm25Chain } from "./Il33Pm25Chain";
import { LoudounAsthmaVsState } from "./LoudounAsthmaVsState";
import { KnowledgeGraphHero } from "./KnowledgeGraphHero";

/**
 * Client wrapper: reads the requested size from the query string and renders
 * the matching figure inside the branded FigureFrame. Data arrives as a prop
 * built server-side, so no filesystem access happens in the browser.
 */
export function FigureCanvas({ payload }: { payload: FigurePayload }) {
  const params = useSearchParams();
  const size: FigureSize = params.get("size") === "square" ? "square" : "card";
  const meta = FIGURES[payload.id];
  if (!meta) return null;

  return (
    <div style={{ display: "inline-block" }}>
      <FigureFrame size={size} meta={meta}>
        {payload.id === "il33-pm25-chain" && (
          <Il33Pm25Chain size={size} data={payload.data} meta={meta} />
        )}
        {payload.id === "loudoun-asthma-vs-state" && (
          <LoudounAsthmaVsState size={size} data={payload.data} meta={meta} />
        )}
        {payload.id === "knowledge-graph-hero" && (
          <KnowledgeGraphHero size={size} data={payload.data} meta={meta} />
        )}
      </FigureFrame>
    </div>
  );
}
