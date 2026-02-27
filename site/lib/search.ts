import Fuse from "fuse.js";

import { getSynonyms, listDiseases, listExposures, listGenes, listPathways } from "./data";

export interface SearchResultItem {
  slug: string;
  type: "disease" | "exposure" | "gene" | "pathway";
  label: string;
  summary: string;
  confidence?: string;
  href: string;
}

export async function buildSearchIndex(): Promise<SearchResultItem[]> {
  const [diseases, exposures, genes, pathways] = await Promise.all([
    listDiseases(),
    listExposures(),
    listGenes(),
    listPathways()
  ]);

  return [
    ...diseases.map((entity) => ({
      slug: entity.slug,
      type: "disease" as const,
      label: entity.name,
      summary: entity.summary,
      confidence: "high",
      href: `/atlas/diseases/${entity.slug}`
    })),
    ...exposures.map((entity) => ({
      slug: entity.slug,
      type: "exposure" as const,
      label: entity.name,
      summary: entity.definition,
      confidence: "high",
      href: `/atlas/exposures/${entity.slug}`
    })),
    ...genes.map((entity) => ({
      slug: entity.slug,
      type: "gene" as const,
      label: entity.symbol,
      summary: entity.summary,
      confidence: entity.confidence,
      href: `/atlas/genes/${entity.slug}`
    })),
    ...pathways.map((entity) => ({
      slug: entity.slug,
      type: "pathway" as const,
      label: entity.name,
      summary: entity.summary,
      confidence: "medium",
      href: `/atlas/pathways/${entity.slug}`
    }))
  ];
}

function expandQueryWithSynonyms(query: string, synonyms: Record<string, string[]>): string[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];
  const direct = synonyms[normalized] ?? [];
  const reverse = Object.entries(synonyms)
    .filter(([, values]) => values.some((value) => value.toLowerCase() === normalized))
    .map(([key]) => key);
  return [normalized, ...direct.map((entry) => entry.toLowerCase()), ...reverse];
}

export async function runSearch(query: string): Promise<SearchResultItem[]> {
  const [index, synonyms] = await Promise.all([buildSearchIndex(), getSynonyms()]);
  const expandedQueries = expandQueryWithSynonyms(query, synonyms);
  if (!expandedQueries.length) return [];

  const fuse = new Fuse(index, {
    includeScore: true,
    threshold: 0.38,
    keys: ["label", "summary", "slug"]
  });

  const merged = new Map<string, SearchResultItem>();
  for (const q of expandedQueries) {
    for (const result of fuse.search(q, { limit: 8 })) {
      merged.set(result.item.href, result.item);
    }
  }
  return Array.from(merged.values()).slice(0, 10);
}
