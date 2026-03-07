import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getGraphData } from "@/lib/data";

const GraphPageClient = dynamic(
  () => import("@/components/GraphPageClient").then((m) => m.GraphPageClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[600px] flex items-center justify-center text-cool-mid border border-white/[0.06] rounded-sm bg-navy-mid">
        Loading graph...
      </div>
    ),
  }
);

export default function GraphPage() {
  const graphData = getGraphData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Knowledge Graph" }]} />
        <header>
          <h1 className="text-h1 text-surface-white">Knowledge Graph</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Interactive network of diseases, genes, exposures, and pathways.
            Click nodes and edges for details. Use layout and export controls.
            Population-level relationships for educational purposes only.
          </p>
        </header>
        <Suspense
          fallback={
            <div className="min-h-[600px] flex items-center justify-center text-cool-mid border border-white/[0.06] rounded-sm bg-navy-mid">
              Loading graph...
            </div>
          }
        >
          <GraphPageClient initialData={graphData} />
        </Suspense>
      </div>
    </div>
  );
}
