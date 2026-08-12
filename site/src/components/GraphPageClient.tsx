"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/types";
import type { Core, EdgeSingular, NodeSingular } from "cytoscape";

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

const EDGE_COLORS: Record<string, string> = {
  GWAS: "#89E5E6",
  eQTL: "#4ADE80",
  pathway: "#A855F7",
  literature: "#94A3B8",
  inferred: "#FBBF24",
};

const DIRECTION_COLORS: Record<string, string> = {
  amplify: "#C53030",
  buffer: "#2F855A",
  unknown: "#A0AEC0",
  bidirectional: "#94A3B8",
};

const CONFIDENCE_OPACITY: Record<string, number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

function edgeWidth(strength: number): number {
  if (strength >= 0.6) return 3;
  if (strength >= 0.3) return 2;
  return 1;
}

export interface GraphPageClientProps {
  initialData: GraphData | null;
}

/**
 * Classify an edge's `sources` array.
 *
 * Reference IDs in this atlas are file-local (`ref1`..`ref11`, reused across ~83 files with a
 * different meaning in each), and graph edges carry them with no namespace. A token matching
 * ^ref\d+$ on an edge is therefore not resolvable to a specific paper — it is a placeholder,
 * not a citation. Until the backfill lands, say so rather than rendering the bare token.
 */
export function citationState(sources: string[] | undefined): {
  resolved: boolean;
  reason: "resolved" | "placeholder" | "empty";
} {
  if (!sources || sources.length === 0) return { resolved: false, reason: "empty" };
  const allPlaceholder = sources.every((s) => /^ref\d+$/.test(s.trim()));
  return allPlaceholder
    ? { resolved: false, reason: "placeholder" }
    : { resolved: true, reason: "resolved" };
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
  const tooltipRef = useRef<HTMLDivElement>(null);
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
      edges = edges.filter((e) => e.attrs?.evidence_type === filters.evidenceType);
      const nodeIds = new Set(edges.flatMap((e) => [e.source, e.target]));
      nodes = nodes.filter((n) => nodeIds.has(n.id));
    }
    if (filters.confidence) {
      nodes = nodes.filter((n) => n.attrs?.confidence === filters.confidence);
      const nodeIds = new Set(nodes.map((n) => n.id));
      edges = edges.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
      );
    }
    if (filters.ancestryRep) {
      edges = edges.filter((e) => e.attrs?.ancestry_rep === filters.ancestryRep);
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

    let cancelled = false;
    const container = containerRef.current;

    import("cytoscape").then((cytoscapeModule) => {
      const cytoscape = cytoscapeModule.default;
      if (cancelled || !containerRef.current) return;

      const cy = cytoscape({
        container: container,
        elements: [...elements.nodes, ...elements.edges],
        style: [
          {
            selector: "node",
            style: {
              "background-color": (ele: { data: (k: string) => string }) =>
                NODE_COLORS[ele.data("type")] ?? "#999",
              shape: (ele: { data: (k: string) => string }) =>
                (NODE_SHAPES[ele.data("type")] ?? "ellipse") as "ellipse" | "hexagon" | "diamond" | "roundrectangle" | "triangle",
              label: "data(label)",
              "text-valign": "bottom",
              "text-margin-y": 4,
              "font-size": 10,
              color: "#C7D2DA",
              width: 36,
              height: 36,
            },
          },
          {
            selector: "edge",
            style: {
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "line-color": ((ele: { data: (k: string) => string }) => {
                const dir = ele.data("direction");
                if (dir && dir !== "unknown" && dir !== "bidirectional") {
                  return DIRECTION_COLORS[dir] ?? "#94A3B8";
                }
                const et = ele.data("evidence_type");
                return EDGE_COLORS[et] ?? "#94A3B8";
              }) as unknown as string,
              "target-arrow-color": ((ele: { data: (k: string) => string }) => {
                const dir = ele.data("direction");
                if (dir && dir !== "unknown" && dir !== "bidirectional") {
                  return DIRECTION_COLORS[dir] ?? "#94A3B8";
                }
                const et = ele.data("evidence_type");
                return EDGE_COLORS[et] ?? "#94A3B8";
              }) as unknown as string,
              width: ((ele: { data: (k: string) => number }) => {
                const s = ele.data("strength");
                return edgeWidth(typeof s === "number" ? s : 0);
              }) as unknown as number,
              opacity: ((ele: { data: (k: string) => string }) => {
                const c = ele.data("confidence");
                return CONFIDENCE_OPACITY[c] ?? 0.7;
              }) as unknown as number,
            },
          },
          {
            selector: ":selected",
            style: {
              "border-width": 3,
              "border-color": "#2DD4BF",
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

      cy.on("mouseover", "edge", (ev) => {
        const tip = tooltipRef.current;
        if (!tip) return;
        const d = ev.target.data();
        const pos = ev.renderedPosition ?? ev.position;
        tip.style.left = `${(pos?.x ?? 0) + 12}px`;
        tip.style.top = `${(pos?.y ?? 0) + 12}px`;
        tip.style.display = "block";
        const dirColor = DIRECTION_COLORS[d.direction] ?? "#94A3B8";
        const tissue = Array.isArray(d.tissue) ? d.tissue.join(", ") : (d.tissue ?? "—");
        const rawStats = d.raw_statistics;
        const rawHtml = rawStats ? `
          <div class="mt-1 pt-1 border-t border-white/10">
            ${rawStats.p_value != null ? `<div>p: ${rawStats.p_value.toExponential(1)}</div>` : ""}
            ${rawStats.odds_ratio != null ? `<div>OR: ${rawStats.odds_ratio}${rawStats.ci_lower != null ? ` [${rawStats.ci_lower}, ${rawStats.ci_upper}]` : ""}</div>` : ""}
            ${rawStats.sample_size != null ? `<div>N: ${rawStats.sample_size.toLocaleString()}</div>` : ""}
          </div>` : "";
        tip.innerHTML = `<div class="text-xs space-y-1">
          <div class="font-medium text-surface-white">${d.evidence_type ?? "—"}</div>
          <div>Direction: <span style="color:${dirColor}">${d.direction ?? "—"}</span></div>
          <div>Tissue: ${tissue}</div>
          <div>Strength: ${typeof d.strength === "number" ? d.strength.toFixed(2) : "—"}</div>
          <div>Confidence: <span class="badge badge-${d.confidence ?? "low"}">${d.confidence ?? "—"}</span></div>
          <div>Sources: ${(d.sources?.length ?? 0)}</div>
          ${rawHtml}
        </div>`;
      });
      cy.on("mouseout", "edge", () => {
        const tip = tooltipRef.current;
        if (tip) tip.style.display = "none";
      });
    });

    return () => {
      cancelled = true;
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
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
      const { toSvg } = await import("html-to-image");
      const { saveAs } = await import("file-saver");
      const dataUrl = await toSvg(containerRef.current, { pixelRatio: 2 });
      const blob = await fetch(dataUrl).then((r) => r.blob());
      saveAs(blob, "genarch-graph.svg");
    } catch {
      exportPNG();
    }
  };

  const exportJSON = async () => {
    if (!initialData) return;
    const { saveAs } = await import("file-saver");
    const blob = new Blob([JSON.stringify(initialData, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "genarch-graph.json");
  };

  if (!initialData) {
    return (
      <div className="card">
        <p className="text-cool-mid">No graph data available.</p>
      </div>
    );
  }

  const entityTypes = Array.from(new Set(initialData.nodes.map((n) => n.type).filter(Boolean)));
  const evidenceTypes = Array.from(
    new Set(
      initialData.edges
        .map((e) => e.attrs?.evidence_type)
        .filter(Boolean)
    )
  ) as string[];
  const confidences = Array.from(
    new Set(
      initialData.nodes
        .map((n) => n.attrs?.confidence)
        .filter(Boolean)
    )
  ) as string[];
  const ancestryReps = Array.from(
    new Set(
      initialData.edges
        .map((e) => e.attrs?.ancestry_rep)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <div className="space-y-4">
      <details className="card">
        <summary className="cursor-pointer font-medium text-surface-white">
          Filters
        </summary>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="filter-entity" className="block text-sm text-cool-mid mb-1">Entity type</label>
            <select
              id="filter-entity"
              value={filters.entityType}
              onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
              className="w-full text-sm border border-white/[0.06] bg-navy-deep text-surface-white rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-evidence" className="block text-sm text-cool-mid mb-1">Evidence type</label>
            <select
              id="filter-evidence"
              value={filters.evidenceType}
              onChange={(e) => setFilters((f) => ({ ...f, evidenceType: e.target.value }))}
              className="w-full text-sm border border-white/[0.06] bg-navy-deep text-surface-white rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {evidenceTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-confidence" className="block text-sm text-cool-mid mb-1">Confidence</label>
            <select
              id="filter-confidence"
              value={filters.confidence}
              onChange={(e) => setFilters((f) => ({ ...f, confidence: e.target.value }))}
              className="w-full text-sm border border-white/[0.06] bg-navy-deep text-surface-white rounded-sm px-2 py-1.5"
            >
              <option value="">All</option>
              {confidences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-ancestry" className="block text-sm text-cool-mid mb-1">Ancestry rep.</label>
            <select
              id="filter-ancestry"
              value={filters.ancestryRep}
              onChange={(e) => setFilters((f) => ({ ...f, ancestryRep: e.target.value }))}
              className="w-full text-sm border border-white/[0.06] bg-navy-deep text-surface-white rounded-sm px-2 py-1.5"
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
                ? "bg-teal-primary text-navy-deep"
                : "bg-white/[0.03] text-cool-light"
            }`}
          >
            Force-directed
          </button>
          <button
            type="button"
            onClick={() => setLayoutType("hierarchical")}
            className={`px-3 py-1.5 text-sm rounded-sm ${
              layoutType === "hierarchical"
                ? "bg-teal-primary text-navy-deep"
                : "bg-white/[0.03] text-cool-light"
            }`}
          >
            Hierarchical
          </button>
          <button
            type="button"
            onClick={() => setLayoutType("circular")}
            className={`px-3 py-1.5 text-sm rounded-sm ${
              layoutType === "circular"
                ? "bg-teal-primary text-navy-deep"
                : "bg-white/[0.03] text-cool-light"
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
        <div className="relative flex-1">
          <div
            ref={containerRef}
            className="min-h-[500px] border border-white/[0.06] rounded-sm bg-navy-mid"
            style={{ height: "600px" }}
            aria-label="Knowledge graph"
          />
          <div
            ref={tooltipRef}
            className="absolute z-10 pointer-events-none rounded-md border border-white/[0.1] bg-navy-deep px-3 py-2 shadow-lg"
            style={{ display: "none" }}
          />
        </div>
        <aside className="w-80 flex-shrink-0 space-y-4">
          {selectedNode && (
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-2">
                {selectedNode.label}
              </h3>
              <p className="text-xs text-cool-mid mb-2">
                {selectedNode.type}
              </p>
              {selectedNode.attrs?.summary && (
                <p className="text-sm text-cool-light mb-4">
                  {selectedNode.attrs.summary}
                </p>
              )}
              <Link
                href={getNodeHref(selectedNode)}
                className="text-teal-primary text-sm hover:text-teal-soft hover:underline"
              >
                View full page →
              </Link>
            </div>
          )}
          {selectedEdge && (
            <div className="card">
              <h3 className="text-h3 text-surface-white mb-2">Edge Detail</h3>
              <p className="text-sm text-cool-light mb-2">
                {selectedEdge.source.label} → {selectedEdge.target.label}
              </p>
              <dl className="text-sm space-y-1">
                <dt className="text-cool-mid">Evidence type</dt>
                <dd className="text-surface-white">{selectedEdge.edge.attrs?.evidence_type ?? "—"}</dd>
                <dt className="text-cool-mid mt-2">Direction</dt>
                <dd className="text-surface-white" style={{ color: DIRECTION_COLORS[selectedEdge.edge.attrs?.direction] }}>{selectedEdge.edge.attrs?.direction ?? "—"}</dd>
                <dt className="text-cool-mid mt-2">Tissue</dt>
                <dd className="text-surface-white">{Array.isArray(selectedEdge.edge.attrs?.tissue) ? selectedEdge.edge.attrs.tissue.join(", ") : (selectedEdge.edge.attrs?.tissue ?? "—")}</dd>
                <dt className="text-cool-mid mt-2">Strength</dt>
                <dd className="text-surface-white">{typeof selectedEdge.edge.attrs?.strength === "number" ? selectedEdge.edge.attrs.strength.toFixed(2) : "—"}</dd>
                <dt className="text-cool-mid mt-2">Confidence</dt>
                <dd className="text-surface-white"><span className={`badge badge-${selectedEdge.edge.attrs?.confidence ?? "low"}`}>{selectedEdge.edge.attrs?.confidence ?? "—"}</span></dd>
                {selectedEdge.edge.attrs?.ancestry_rep && (
                  <>
                    <dt className="text-cool-mid mt-2">Ancestry</dt>
                    <dd className="text-surface-white">{selectedEdge.edge.attrs.ancestry_rep}</dd>
                  </>
                )}
                {/* The Sources row always renders. Hiding it when empty implied no source
                    was required; showing raw `ref1, ref2` implied a resolvable citation.
                    Placeholder and empty states are both surfaced explicitly instead. */}
                <dt className="text-cool-mid mt-2">Sources</dt>
                <dd className="text-surface-white">
                  {citationState(selectedEdge.edge.attrs?.sources).resolved ? (
                    (selectedEdge.edge.attrs?.sources ?? []).join(", ")
                  ) : (
                    <span className="text-cool-mid italic">
                      Citation record pending — see{" "}
                      <Link href="/methods/" className="text-teal-primary hover:text-teal-soft hover:underline not-italic">
                        Methods
                      </Link>{" "}
                      for current data-quality status.
                    </span>
                  )}
                </dd>
                {selectedEdge.edge.attrs?.raw_statistics && (
                  <>
                    <dt className="text-cool-mid mt-2">Raw Statistics</dt>
                    <dd className="text-surface-white text-xs space-y-0.5">
                      {selectedEdge.edge.attrs.raw_statistics.p_value != null && (
                        <div>p-value: {selectedEdge.edge.attrs.raw_statistics.p_value.toExponential(1)}</div>
                      )}
                      {selectedEdge.edge.attrs.raw_statistics.odds_ratio != null && (
                        <div>
                          OR: {selectedEdge.edge.attrs.raw_statistics.odds_ratio}
                          {selectedEdge.edge.attrs.raw_statistics.ci_lower != null && (
                            <> [{selectedEdge.edge.attrs.raw_statistics.ci_lower}, {selectedEdge.edge.attrs.raw_statistics.ci_upper}]</>
                          )}
                        </div>
                      )}
                      {selectedEdge.edge.attrs.raw_statistics.sample_size != null && (
                        <div>N: {selectedEdge.edge.attrs.raw_statistics.sample_size.toLocaleString()}</div>
                      )}
                      {selectedEdge.edge.attrs.raw_statistics.source_study && (
                        <div>Study: {selectedEdge.edge.attrs.raw_statistics.source_study}</div>
                      )}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )}
          <div className="card">
            <h3 className="text-h3 text-surface-white mb-3">Node Legend</h3>
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
                  <span className="capitalize text-cool-light">{type}</span>
                </li>
              ))}
            </ul>
            <h3 className="text-h3 text-surface-white mt-4 mb-3">Edge Legend</h3>
            <ul className="space-y-2 text-sm">
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <li key={type} className="flex items-center gap-2">
                  <span className="inline-block w-6 h-0.5" style={{ backgroundColor: color }} aria-hidden />
                  <span className="text-cool-light">{type}</span>
                </li>
              ))}
            </ul>
            <h4 className="text-xs text-cool-mid mt-3 mb-1">Direction</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <span className="inline-block w-6 h-0.5" style={{ backgroundColor: "#C53030" }} aria-hidden />
                <span className="text-cool-light">amplify</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block w-6 h-0.5" style={{ backgroundColor: "#2F855A" }} aria-hidden />
                <span className="text-cool-light">buffer</span>
              </li>
            </ul>
            <h4 className="text-xs text-cool-mid mt-3 mb-1">Width = strength</h4>
            <p className="text-xs text-cool-mid">Thin (0&ndash;0.3) &middot; Medium (0.3&ndash;0.6) &middot; Thick (0.6&ndash;1.0)</p>
            <h4 className="text-xs text-cool-mid mt-2 mb-1">Opacity = confidence</h4>
            <p className="text-xs text-cool-mid">Low (40%) &middot; Medium (70%) &middot; High (100%)</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
