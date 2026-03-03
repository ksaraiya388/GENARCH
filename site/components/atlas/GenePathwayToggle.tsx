"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Gene, Pathway } from "@/lib/types";

interface Props {
  genes: Gene[];
  pathways: Pathway[];
}

export function GenePathwayToggle({ genes, pathways }: Props): JSX.Element {
  const [tab, setTab] = useState<"genes" | "pathways">("genes");
  const [query, setQuery] = useState("");

  const filteredGenes = useMemo(
    () =>
      genes.filter((gene) =>
        `${gene.symbol} ${gene.name} ${gene.slug}`.toLowerCase().includes(query.toLowerCase())
      ),
    [genes, query]
  );

  const filteredPathways = useMemo(
    () =>
      pathways.filter((pathway) =>
        `${pathway.name} ${pathway.slug}`.toLowerCase().includes(query.toLowerCase())
      ),
    [pathways, query]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm font-semibold ${
            tab === "genes" ? "bg-graph text-textPrimary" : "border border-slate-300 bg-white"
          }`}
          onClick={() => setTab("genes")}
        >
          Genes
        </button>
        <button
          type="button"
          className={`rounded px-3 py-1.5 text-sm font-semibold ${
            tab === "pathways" ? "bg-graph text-textPrimary" : "border border-slate-300 bg-white"
          }`}
          onClick={() => setTab("pathways")}
        >
          Pathways
        </button>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="ml-auto w-full rounded border border-slate-300 px-3 py-2 text-sm md:w-80"
          placeholder="Filter by symbol, synonym, or keyword"
          aria-label="Filter genes and pathways"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {tab === "genes"
          ? filteredGenes.map((gene) => (
              <Link
                href={`/atlas/genes/${gene.slug}`}
                key={gene.slug}
                className="content-card no-underline hover:-translate-y-0.5 transition-transform"
              >
                <h2 className="section-title">{gene.symbol}</h2>
                <p className="mt-1 text-sm text-textSecondary">{gene.name}</p>
                <p className="mt-2 text-xs text-textSecondary">
                  Linked diseases: {gene.linked_diseases.length} • Linked exposures:{" "}
                  {gene.linked_exposures.length}
                </p>
              </Link>
            ))
          : filteredPathways.map((pathway) => (
              <Link
                href={`/atlas/pathways/${pathway.slug}`}
                key={pathway.slug}
                className="content-card no-underline hover:-translate-y-0.5 transition-transform"
              >
                <h2 className="section-title">{pathway.name}</h2>
                <p className="mt-2 text-sm text-textSecondary">{pathway.summary.slice(0, 150)}...</p>
                <p className="mt-2 text-xs text-textSecondary">Key genes: {pathway.key_genes.length}</p>
              </Link>
            ))}
      </div>
    </div>
  );
}
