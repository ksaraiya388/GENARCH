"use client";

import { useState } from "react";
import Link from "next/link";
import type { Gene, Pathway } from "@/lib/types";
import { ConfidenceBadge } from "./ConfidenceBadge";

function toConfidenceTier(c?: string): "LOW" | "MEDIUM" | "HIGH" {
  if (!c) return "LOW";
  const u = c.toUpperCase();
  return u === "HIGH" || u === "MEDIUM" || u === "LOW" ? u : "LOW";
}

interface GenesPathwaysToggleProps {
  genes: Gene[];
  pathways: Pathway[];
}

export function GenesPathwaysToggle({
  genes,
  pathways,
}: GenesPathwaysToggleProps) {
  const [active, setActive] = useState<"genes" | "pathways">("genes");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded-sm border px-4 py-2 text-sm font-medium transition-colors ${
            active === "genes"
              ? "border-teal-primary bg-teal-primary text-navy-deep"
              : "border-white/[0.06] text-cool-light hover:bg-white/[0.04]"
          }`}
          onClick={() => setActive("genes")}
        >
          Genes
        </button>
        <button
          type="button"
          className={`rounded-sm border px-4 py-2 text-sm font-medium transition-colors ${
            active === "pathways"
              ? "border-teal-primary bg-teal-primary text-navy-deep"
              : "border-white/[0.06] text-cool-light hover:bg-white/[0.04]"
          }`}
          onClick={() => setActive("pathways")}
        >
          Pathways
        </button>
      </div>

      {active === "genes" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {genes.map((gene) => (
            <Link
              key={gene.slug}
              href={`/atlas/genes/${gene.slug}`}
              className="card block no-underline transition-shadow hover:shadow-md"
            >
              <h2 className="text-h3 text-surface-white mb-2">
                {gene.symbol}
                {gene.name && gene.name !== gene.symbol && (
                  <span className="text-cool-mid font-normal ml-1 text-xs">
                    — {gene.name}
                  </span>
                )}
              </h2>
              <p className="text-sm text-cool-light line-clamp-2 mb-4">
                {gene.summary}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <ConfidenceBadge tier={toConfidenceTier(gene.confidence)} />
                <span className="text-xs text-cool-mid">
                  {gene.pathways?.length ?? 0} pathway(s)
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {active === "pathways" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pathways.map((pathway) => (
            <Link
              key={pathway.slug}
              href={`/atlas/pathways/${pathway.slug}`}
              className="card block no-underline transition-shadow hover:shadow-md"
            >
              <h2 className="text-h3 text-surface-white mb-2">{pathway.name}</h2>
              <p className="text-sm text-cool-light line-clamp-2 mb-4">
                {pathway.summary}
              </p>
              <div className="text-xs text-cool-mid">
                {pathway.key_genes?.length ?? 0} key gene(s) ·{" "}
                {pathway.linked_diseases?.length ?? 0} disease(s)
              </div>
            </Link>
          ))}
        </div>
      )}

      {active === "genes" && genes.length === 0 && (
        <p className="text-cool-light italic">No genes in the atlas yet.</p>
      )}
      {active === "pathways" && pathways.length === 0 && (
        <p className="text-cool-light italic">No pathways in the atlas yet.</p>
      )}
    </div>
  );
}
