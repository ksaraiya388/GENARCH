import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getGraphData } from "@/lib/data";
import { GraphPageClient } from "@/components/GraphPageClient";
import { Suspense } from "react";

export default function GraphPage() {
  const graphData = getGraphData();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Knowledge Graph" }]} />
      <header>
        <h1 className="text-h1 text-genarch-text">Knowledge Graph</h1>
        <p className="mt-2 text-genarch-subtext max-w-2xl">
          Interactive network of diseases, genes, exposures, and pathways.
          Click nodes and edges for details. Use layout and export controls.
          Population-level relationships for educational purposes only.
        </p>
      </header>
      <Suspense fallback={<div className="min-h-[600px] flex items-center justify-center text-genarch-subtext">Loading graph...</div>}>
        <GraphPageClient initialData={graphData} />
      </Suspense>
    </div>
  );
}
