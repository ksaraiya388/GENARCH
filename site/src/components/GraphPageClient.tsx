"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import cytoscape, { type Core, type EdgeSingular, type NodeSingular, type Css } from "cytoscape";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/types";
import { saveAs } from "file-saver";
import { toSvg } from "html-to-image";

type LayoutType = "force" | "hierarchical" | "circular";

const NODE_COLORS: Record<string, string> = {
  disease: "#F2766A",
  exposure: "#F39C6B",
  gene: "#89E5E6",
  variant: "#D3B3D3",
  pathway: "#F5C75A",
  tissue: "#EFE789",
};

const NODE_SHAPES: Record<string, string> = {
  disease: "ellipse",
  exposure: "diamond",
  gene: "hexagon",
  variant: "triangle",
  pathway: "roundrectangle",
  tissue: "ellipse",
};

export interface GraphPageClientProps {
  initialData: GraphData | null;
}

export function GraphPageClient({ initialData }: GraphPageClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{
    edge: GraphEdge;
    source: GraphNode;
    target: GraphNode;
  } | null>(null);
  const [layoutType, setLayoutType] = useState<LayoutType>("force");
  const [filters, setFilters] = useState({
    entityType: "",
    disease: "",
    exposure: "",
    tissue: "",
    evidenceType: "",
    confidence: "",
    ancestryRep: "",
  });
  const searchParams = useSearchParams();

  const getNodeHref = useCallback((node: GraphNode) => {
    switch (node.type) {
      case "disease":
        return `/atlas/diseases/${node.slug}`;
      case "exposure":
        return `/atlas/exposures/${node.slug}`;
      case "gene":
        return `/atlas/genes-pathways?gene=${node.slug}`;
      case "pathway":
        return `/atlas/genes-pathways?pathway=${node.slug}`;
      default:
        return "#";
    }
  }, []);

  const filteredData = useCallback((): GraphData | null => {
    if (!initialData) return null;
    let nodes = initialData.nodes;
    let edges = initialData.edges;
    if (filters.entityType) {
      nodes = nodes.filter((n) => n.type === filters.entityType);
      const nodeIds = new Set(nodes.map((n) => n.id));
      edges = edges.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }
    if (filters.evidenceType) {
      edges = edges.filter((e) => e.attrs.evidence_type === filters.evidenceType);
      const nodeIds = new Set(edges.flatMap((e) => [e.source, e.target]));
      nodes = nodes.filter((n) => nodeIds.has(n.id));
    }
    if (filters.confidence) {
      nodes = nodes.filter((n) => n.attrs.confidence === filters.confidence);
      const nodeIds = new Set(nodes.map((n) => n.id));
      edges = edges.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }
    if (filters.ancestryRep) {
      edges = edges.filter((e) => e.attrs.ancestry_rep === filters.ancestryRep);
      const nodeIds = new Set(edges.flatMap((e) => [e.source, e.target]));
      nodes = nodes.filter((n) => nodeIds.has(n.id));
    }
    return {
      nodes,
      edges,
      metadata: { ...initialData.metadata, node_count: nodes.length, edge_count: edges.length },
    };
  }, [initialData, filters]);

  const displayData = filteredData();

  const buildElements = useCallback(() => {
    if (!displayData) return { nodes: [], edges: [] };
    const nodes = displayData.nodes.map((n) => ({
      group: "nodes" as const,
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        slug: n.slug,
        ...n.attrs,
      },
    }));
    const edges = displayData.edges.map((e) => ({
      group: "edges" as const,
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        ...e.attrs,
      },
    }));
    return { nodes, edges };
  }, [displayData]);

  useEffect(() => {
    if (!containerRef.current || !displayData) return;

    const elements = buildElements();
    if (elements.nodes.length === 0 && elements.edges.length === 0) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...elements.nodes, ...elements.edges],
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele) =>
              NODE_COLORS[ele.data("type")] ?? "#999",
            shape: ((ele: NodeSingular) =>
              NODE_SHAPES[ele.data("type")] ?? "ellipse") as unknown as Css.PropertyValueNode<Css.NodeShape>,
            label: "data(label)",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "font-size": 10,
            width: 36,
            height: 36,
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#999",
            "target-arrow-color": "#999",
          },
        },
        {
          selector: ":selected",
          style: {
            "border-width": 3,
            "border-color": "#0066CC",
          },
        },
      ],
      layout: { name: "cose", animate: true },
      minZoom: 0.2,
      maxZoom: 4,
    });

    cyRef.current = cy;

    const handleNodeTap = (ev: { target: NodeSingular }) => {
      const target = ev.target;
      if (target.isNode()) {
        const node = displayData.nodes.find((n) => n.id === target.id());
        setSelectedNode(node ?? null);
        setSelectedEdge(null);
      }
    };

    const handleEdgeTap = (ev: { target: EdgeSingular }) => {
      const target = ev.target;
      if (target.isEdge()) {
        const edge = displayData.edges.find((e) => e.id === target.id());
        if (edge) {
          const source = displayData.nodes.find((n) => n.id === edge.source);
          const targetNode = displayData.nodes.find((n) => n.id === edge.target);
          setSelectedEdge(
            source && targetNode
              ? { edge, source, target: targetNode }
              : null
          );
          setSelectedNode(null);
        }
      }
    };

    cy.on("tap", "node", handleNodeTap);
    cy.on("tap", "edge", handleEdgeTap);
    cy.on("tap", (ev) => {
      if (ev.target === cy) {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [displayData, buildElements]);

  useEffect(() => {
    if (!cyRef.current) return;
    const layoutName =
      layoutType === "force"
        ? "cose"
        : layoutType === "hierarchical"
          ? "breadthfirst"
          : "circle";
    cyRef.current.layout({
      name: layoutName,
      animate: true,
      padding: 20,
    }).run();
  }, [layoutType]);

  useEffect(() => {
    const nodeId = searchParams.get("node");
    const edgeId = searchParams.get("edge");
    if (nodeId && displayData) {
      const node = displayData.nodes.find((n) => n.id === nodeId);
      if (node) setSelectedNode(node);
    }
    if (edgeId && displayData) {
      const edge = displayData.edges.find((e) => e.id === edgeId);
      if (edge) {
        const source = displayData.nodes.find((n) => n.id === edge.source);
        const target = displayData.nodes.find((n) => n.id === edge.target);
        if (source && target)
          setSelectedEdge({ edge, source, target });
      }
    }
  }, [searchParams, displayData]);

  const exportPNG = () => {
    if (!cyRef.current) return;
    const dataUrl = cyRef.current.png({ scale: 2 });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "genarch-graph.png";
    link.click();
  };

  const exportSVG = async () => {
    if (!containerRef.current || !cyRef.current) return;
    try {
      const dataUrl = await toSvg(containerRef.current, { pixelRatio: 2 });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      saveAs(blob, "genarch-graph.svg");
    } catch {
      // Fallback: offer PNG if SVG fails
      exportPNG();
    }
  };

  const exportJSON = () => {
    if (!initialData) return;
    const blob = new Blob([JSON.stringify(initialData, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "genarch-graph.json");
  };

  if (!initialData) {
    return (
      <div className="card">
        <p className="text-genarch-subtext">No graph data available.</p>
      </div>
    );
  }

  const entityTypes = Array.from(new Set(initialData.nodes.map((n) => n.type)));
  const evidenceTypes = Array.from(new Set(initialData.edges.map((e) => e.attrs.evidence_type)));
  const confidences = Array.from(
    new Set(initialData.nodes.map((n) => n.attrs.confidence).filter(Boolean))
  );
  const ancestryReps = Array.from(
    new Set(initialData.edges.map((e) => e.attrs.ancestry_rep).filter(Boolean))
  );

  return (
    <div className="space-y-4">
      <details className="card">
        <summary className="cursor-pointer font-medium text-genarch-text">
          Filters
        </summary>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-entity" className="block text-sm text-genarch-subtext mb-1">Entity type</label>
            <select
              id="filter-entity"
              value={filters.entityType}
              onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-evidence" className="block text-sm text-genarch-subtext mb-1">Evidence type</label>
            <select
              id="filter-evidence"
              value={filters.evidenceType}
              onChange={(e) => setFilters((f) => ({ ...f, evidenceType: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {evidenceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-confidence" className="block text-sm text-genarch-subtext mb-1">Confidence</label>
            <select
              id="filter-confidence"
              value={filters.confidence}
              onChange={(e) => setFilters((f) => ({ ...f, confidence: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {confidences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-ancestry" className="block text-sm text-genarch-subtext mb-1">Ancestry rep.</label>
            <select
              id="filter-ancestry"
              value={filters.ancestryRep}
              onChange={(e) => setFilters((f) => ({ ...f, ancestryRep: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {ancestryReps.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </details>
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLayoutType("force")}
            className={`px-3 py-1.5 text-sm rounded-sm ${
              layoutType === "force"
                ? "bg-genarch-action text-white"
                : "bg-gray-100 text-genarch-text"
            }`}
          >
            Force-directed
          </button>
          <button
            type="button"
            onClick={() => setLayoutType("hierarchical")}
            className={`px-3 py-1.5 text-sm rounded-sm ${
              layoutType === "hierarchical"
                ? "bg-genarch-action text-white"
                : "bg-gray-100 text-genarch-text"
            }`}
          >
            Hierarchical
          </button>
          <button
            type="button"
            onClick={() => setLayoutType("circular")}
            className={`px-3 py-1.5 text-sm rounded-sm ${
              layoutType === "circular"
                ? "bg-genarch-action text-white"
                : "bg-gray-100 text-genarch-text"
            }`}
          >
            Circular
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportPNG}
            className="btn-secondary text-sm py-1.5"
          >
            Export PNG
          </button>
          <button
            type="button"
            onClick={exportSVG}
            className="btn-secondary text-sm py-1.5"
          >
            Export SVG
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="btn-secondary text-sm py-1.5"
          >
            Export JSON
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div
          ref={containerRef}
          className="flex-1 min-h-[500px] border border-gray-200 rounded-sm bg-white"
          style={{ height: "600px" }}
          aria-label="Knowledge graph"
        />
        <aside className="w-80 flex-shrink-0 space-y-4">
          {selectedNode && (
            <div className="card">
              <h3 className="text-h3 text-genarch-text mb-2">
                {selectedNode.label}
              </h3>
              <p className="text-xs text-genarch-subtext mb-2">
                {selectedNode.type}
              </p>
              {selectedNode.attrs?.summary && (
                <p className="text-sm text-genarch-text mb-4">
                  {selectedNode.attrs.summary}
                </p>
              )}
              <Link
                href={getNodeHref(selectedNode)}
                className="text-genarch-link text-sm hover:underline"
              >
                View full page →
              </Link>
            </div>
          )}
          {selectedEdge && (
            <div className="card">
              <h3 className="text-h3 text-genarch-text mb-2">Edge Detail</h3>
              <p className="text-sm text-genarch-text mb-2">
                {selectedEdge.source.label} → {selectedEdge.target.label}
              </p>
              <dl className="text-sm space-y-1">
                <dt className="text-genarch-subtext">Evidence type</dt>
                <dd>{selectedEdge.edge.attrs.evidence_type}</dd>
                <dt className="text-genarch-subtext mt-2">Confidence</dt>
                <dd>{selectedEdge.edge.attrs.confidence}</dd>
                <dt className="text-genarch-subtext mt-2">Direction</dt>
                <dd>{selectedEdge.edge.attrs.direction}</dd>
                {selectedEdge.edge.attrs.ancestry_rep && (
                  <>
                    <dt className="text-genarch-subtext mt-2">Ancestry</dt>
                    <dd>{selectedEdge.edge.attrs.ancestry_rep}</dd>
                  </>
                )}
                {selectedEdge.edge.attrs.sources?.length > 0 && (
                  <>
                    <dt className="text-genarch-subtext mt-2">Sources</dt>
                    <dd>{selectedEdge.edge.attrs.sources.join(", ")}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
          <div className="card">
            <h3 className="text-h3 text-genarch-text mb-3">Legend</h3>
            <ul className="space-y-2 text-sm">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <li key={type} className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-sm"
                    style={{
                      backgroundColor: color,
                      borderRadius:
                        NODE_SHAPES[type] === "ellipse" ? "50%" : "2px",
                    }}
                    aria-hidden
                  />
                  <span className="capitalize">{type}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
