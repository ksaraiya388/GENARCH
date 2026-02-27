import { Suspense } from "react";

import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { GraphExplorer } from "@/components/graph/GraphExplorer";
import { getGraph } from "@/lib/data";

export default async function GraphPage(): Promise<JSX.Element> {
  const graph = await getGraph();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Knowledge Graph</h1>
        <p className="mt-2 text-textSecondary">
          Filter node and edge relationships across disease, exposure, gene, pathway, tissue, confidence,
          and ancestry representation.
        </p>
      </section>
      <Suspense fallback={<p className="content-card text-sm text-textSecondary">Loading graph controls...</p>}>
        <GraphExplorer graph={graph} />
      </Suspense>
      <EvidenceLimitations />
    </div>
  );
}
