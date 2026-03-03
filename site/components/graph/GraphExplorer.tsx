"use client";

import CytoscapeComponent from "react-cytoscapejs";
import type cytoscape from "cytoscape";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { GraphData, GraphEdge, GraphNode } from "@/lib/types";

type LayoutName = "cose" | "breadthfirst" | "circle";

interface GraphExplorerProps {
  graph: GraphData;
}

type FilterState = {
  nodeType: string;
  disease: string;
  exposure: string;
  tissue: string;
  evidenceType: string;
  confidence: string;
  ancestry: string;
};

const defaultFilters: FilterState = {
  nodeType: "all",
  disease: "all",
  exposure: "all",
  tissue: "all",
  evidenceType: "all",
  confidence: "all",
  ancestry: "all"
};

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function nodeRoute(node: GraphNode): string | null {
  return node.attrs.entity_route ?? null;
}

export function GraphExplorer({ graph }: GraphExplorerProps): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialFilters: FilterState = {
    nodeType: searchParams.get("nodeType") ?? defaultFilters.nodeType,
    disease: searchParams.get("disease") ?? defaultFilters.disease,
    exposure: searchParams.get("exposure") ?? defaultFilters.exposure,
    tissue: searchParams.get("tissue") ?? defaultFilters.tissue,
    evidenceType: searchParams.get("evidenceType") ?? defaultFilters.evidenceType,
    confidence: searchParams.get("confidence") ?? defaultFilters.confidence,
    ancestry: searchParams.get("ancestry") ?? defaultFilters.ancestry
  };

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [layout, setLayout] = useState<LayoutName>("cose");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [cy, setCy] = useState<cytoscape.Core | null>(null);

  const diseaseNodes = useMemo(() => graph.nodes.filter((node) => node.type === "Disease"), [graph.nodes]);
  const exposureNodes = useMemo(
    () => graph.nodes.filter((node) => node.type === "Exposure"),
    [graph.nodes]
  );
  const tissueValues = useMemo(
    () =>
      Array.from(
        new Set(graph.edges.flatMap((edge) => edge.attrs.tissue).map((entry) => entry.toLowerCase()))
      ),
    [graph.edges]
  );
  const evidenceValues = useMemo(
    () => Array.from(new Set(graph.edges.map((edge) => edge.attrs.evidence_type))),
    [graph.edges]
  );
  const confidenceValues = useMemo(
    () => Array.from(new Set(graph.edges.map((edge) => edge.attrs.confidence))),
    [graph.edges]
  );
  const ancestryValues = useMemo(
    () => Array.from(new Set(graph.edges.map((edge) => edge.attrs.ancestry_rep))),
    [graph.edges]
  );

  const filtered = useMemo(() => {
    const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    const candidateEdges = graph.edges.filter((edge) => {
      if (filters.evidenceType !== "all" && edge.attrs.evidence_type !== filters.evidenceType) return false;
      if (filters.confidence !== "all" && edge.attrs.confidence !== filters.confidence) return false;
      if (filters.ancestry !== "all" && edge.attrs.ancestry_rep !== filters.ancestry) return false;
      if (
        filters.tissue !== "all" &&
        !edge.attrs.tissue.map((item) => item.toLowerCase()).includes(filters.tissue.toLowerCase())
      ) {
        return false;
      }
      if (filters.disease !== "all") {
        const diseaseNode = nodeMap.get(edge.source)?.type === "Disease" ? nodeMap.get(edge.source) : nodeMap.get(edge.target);
        if (!diseaseNode || diseaseNode.slug !== filters.disease) return false;
      }
      if (filters.exposure !== "all") {
        const exposureNode = nodeMap.get(edge.source)?.type === "Exposure" ? nodeMap.get(edge.source) : nodeMap.get(edge.target);
        if (!exposureNode || exposureNode.slug !== filters.exposure) return false;
      }
      return true;
    });

    const includedNodeIds = new Set<string>();
    for (const edge of candidateEdges) {
      includedNodeIds.add(edge.source);
      includedNodeIds.add(edge.target);
    }

    let nodes = graph.nodes.filter((node) => includedNodeIds.has(node.id));
    if (filters.nodeType !== "all") {
      nodes = nodes.filter((node) => node.type === filters.nodeType);
    }

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = candidateEdges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return { nodes, edges };
  }, [filters, graph.edges, graph.nodes]);

  const elements = useMemo(() => {
    const nodes = filtered.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        slug: node.slug,
        summary: node.attrs.summary
      }
    }));
    const edges = filtered.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        strength: edge.attrs.strength
      }
    }));
    return [...nodes, ...edges];
  }, [filtered.edges, filtered.nodes]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const next = { ...filters, [key]: value };
    setFilters(next);

    const params = new URLSearchParams();
    for (const [filterKey, filterValue] of Object.entries(next)) {
      if (filterValue !== "all") params.set(filterKey, filterValue);
    }
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  };

  const exportPng = () => {
    if (!cy) return;
    const png = cy.png({ full: true, scale: 2, bg: "white" });
    const blob = dataUriToBlob(png);
    downloadBlob(blob, "genarch-subgraph.png");
  };

  const exportSvg = () => {
    if (!cy) return;
    const nodes = cy.nodes().map((node) => ({
      id: node.id(),
      label: node.data("label") as string,
      x: node.position("x"),
      y: node.position("y")
    }));
    const edges = cy.edges().map((edge) => ({
      source: edge.source().position(),
      target: edge.target().position()
    }));
    const bounds = cy.elements().boundingBox();
    const width = Math.max(400, Math.ceil(bounds.w + 120));
    const height = Math.max(320, Math.ceil(bounds.h + 120));

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="white" />
  ${edges
    .map(
      (edge) =>
        `<line x1="${edge.source.x + 40}" y1="${edge.source.y + 40}" x2="${edge.target.x + 40}" y2="${edge.target.y + 40}" stroke="#94a3b8" stroke-width="1.5" />`
    )
    .join("\n")}
  ${nodes
    .map(
      (node) =>
        `<g><circle cx="${node.x + 40}" cy="${node.y + 40}" r="14" fill="#89E5E6" stroke="#0f172a" stroke-width="1" /><text x="${node.x + 40}" y="${node.y + 44}" text-anchor="middle" font-size="9">${node.label}</text></g>`
    )
    .join("\n")}
</svg>`;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "genarch-subgraph.svg");
  };

  const exportJson = () => {
    const payload = {
      nodes: filtered.nodes,
      edges: filtered.edges,
      exported_at: new Date().toISOString()
    };
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "genarch-subgraph.json");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr_320px]">
      <aside className="content-card space-y-3">
        <h2 className="section-title">Filters</h2>
        <FilterSelect
          label="Node type"
          value={filters.nodeType}
          onChange={(value) => updateFilter("nodeType", value)}
          options={["all", ...Array.from(new Set(graph.nodes.map((node) => node.type)))]}
        />
        <FilterSelect
          label="Disease"
          value={filters.disease}
          onChange={(value) => updateFilter("disease", value)}
          options={["all", ...diseaseNodes.map((node) => node.slug)]}
        />
        <FilterSelect
          label="Exposure"
          value={filters.exposure}
          onChange={(value) => updateFilter("exposure", value)}
          options={["all", ...exposureNodes.map((node) => node.slug)]}
        />
        <FilterSelect
          label="Tissue"
          value={filters.tissue}
          onChange={(value) => updateFilter("tissue", value)}
          options={["all", ...tissueValues]}
        />
        <FilterSelect
          label="Evidence type"
          value={filters.evidenceType}
          onChange={(value) => updateFilter("evidenceType", value)}
          options={["all", ...evidenceValues]}
        />
        <FilterSelect
          label="Confidence"
          value={filters.confidence}
          onChange={(value) => updateFilter("confidence", value)}
          options={["all", ...confidenceValues]}
        />
        <FilterSelect
          label="Ancestry representation"
          value={filters.ancestry}
          onChange={(value) => updateFilter("ancestry", value)}
          options={["all", ...ancestryValues]}
        />
        <FilterSelect
          label="Layout"
          value={layout}
          onChange={(value) => setLayout(value as LayoutName)}
          options={["cose", "breadthfirst", "circle"]}
        />
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={exportPng}
            className="rounded bg-action px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Export PNG
          </button>
          <button
            type="button"
            onClick={exportSvg}
            className="rounded border border-action px-3 py-1.5 text-xs font-semibold text-action"
          >
            Export SVG
          </button>
          <button
            type="button"
            onClick={exportJson}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Export JSON
          </button>
        </div>
      </aside>

      <section className="content-card">
        <h2 className="section-title">Interactive knowledge graph</h2>
        <p className="mt-1 text-sm text-textSecondary">
          Click a node for entity details or an edge for evidence metadata.
        </p>
        <div className="mt-4 h-[560px] rounded border border-slate-200" aria-label="Interactive gene-environment graph">
          <CytoscapeComponent
            elements={elements}
            cy={(instance: cytoscape.Core) => {
              setCy(instance);
              instance.on("tap", "node", (event: cytoscape.EventObject) => {
                const nodeId = event.target.id();
                const node = graph.nodes.find((entry) => entry.id === nodeId) ?? null;
                setSelectedNode(node);
                setSelectedEdge(null);
              });
              instance.on("tap", "edge", (event: cytoscape.EventObject) => {
                const edgeId = event.target.id();
                const edge = graph.edges.find((entry) => entry.id === edgeId) ?? null;
                setSelectedEdge(edge);
                setSelectedNode(null);
              });
            }}
            style={{ width: "100%", height: "100%" }}
            layout={{ name: layout, animate: true }}
            stylesheet={[
              {
                selector: "node",
                style: {
                  label: "data(label)",
                  "font-size": 10,
                  "background-color": "#89E5E6",
                  "border-color": "#1e293b",
                  "border-width": 1.2,
                  color: "#0f172a",
                  width: 28,
                  height: 28,
                  "text-wrap": "wrap",
                  "text-max-width": 80
                }
              },
              {
                selector: "edge",
                style: {
                  width: 1.8,
                  "line-color": "#94a3b8",
                  "curve-style": "bezier",
                  "target-arrow-shape": "triangle",
                  "target-arrow-color": "#94a3b8"
                }
              },
              {
                selector: ":selected",
                style: {
                  "background-color": "#f39c6b",
                  "line-color": "#f39c6b",
                  "target-arrow-color": "#f39c6b"
                }
              }
            ]}
          />
        </div>
      </section>

      <aside className="content-card">
        <h2 className="section-title">Detail panel</h2>
        {!selectedNode && !selectedEdge ? (
          <p className="mt-3 text-sm text-textSecondary">
            Select a node or edge to inspect evidence details and page links.
          </p>
        ) : null}
        {selectedNode ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-semibold text-textPrimary">
              {selectedNode.label} <span className="badge ml-2">{selectedNode.type}</span>
            </p>
            <p className="text-textSecondary">{selectedNode.attrs.summary}</p>
            <p className="text-xs text-textSecondary">Confidence: {selectedNode.attrs.confidence}</p>
            {nodeRoute(selectedNode) ? (
              <Link href={nodeRoute(selectedNode) as string} className="text-sm font-medium">
                Open atlas page
              </Link>
            ) : null}
          </div>
        ) : null}
        {selectedEdge ? (
          <div className="mt-3 space-y-2 text-sm">
            <p className="font-semibold text-textPrimary">{selectedEdge.type}</p>
            <p>
              Evidence type: <span className="font-medium">{selectedEdge.attrs.evidence_type}</span>
            </p>
            <p>
              Direction: <span className="font-medium">{selectedEdge.attrs.direction}</span>
            </p>
            <p>
              Confidence: <span className="font-medium">{selectedEdge.attrs.confidence}</span>
            </p>
            <p>
              Strength: <span className="font-medium">{selectedEdge.attrs.strength.toFixed(2)}</span>
            </p>
            <p>Tissue: {selectedEdge.attrs.tissue.join(", ")}</p>
            <p>Ancestry: {selectedEdge.attrs.ancestry_rep}</p>
            <p className="text-xs text-textSecondary">
              Sources: {selectedEdge.attrs.sources.join(", ")}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="block text-sm text-textSecondary">
      <span>{label}</span>
      <select
        className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-textPrimary"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function dataUriToBlob(dataUri: string): Blob {
  const [meta, content] = dataUri.split(",");
  const isBase64 = meta.includes(";base64");
  const byteString = isBase64 ? atob(content) : decodeURIComponent(content);
  const mime = meta.split(":")[1]?.split(";")[0] || "application/octet-stream";
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}
