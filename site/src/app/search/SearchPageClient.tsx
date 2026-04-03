"use client";

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import Link from "next/link";
import type { SearchItem } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  disease: "Disease",
  exposure: "Exposure",
  gene: "Gene",
  pathway: "Pathway",
  brief: "Mechanism Brief",
};

const TYPE_COLORS: Record<string, string> = {
  disease: "bg-navy-light text-surface-white",
  exposure: "bg-[#C53030]/20 text-[#C53030]",
  gene: "bg-teal-primary/20 text-teal-primary",
  pathway: "bg-[#2F855A]/20 text-[#2F855A]",
  brief: "bg-cool-dark/30 text-cool-light",
};

function getHref(item: SearchItem): string {
  switch (item.type) {
    case "disease":
      return `/atlas/diseases/${item.slug}`;
    case "exposure":
      return `/atlas/exposures/${item.slug}`;
    case "gene":
      return `/atlas/genes/${item.slug}`;
    case "pathway":
      return `/atlas/pathways/${item.slug}`;
    case "brief":
      return `/mechanism-briefs/${item.slug}`;
    default:
      return "/";
  }
}

export function SearchPageClient({ items }: { items: SearchItem[] }) {
  const [query, setQuery] = useState("");

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["name", "summary", "synonyms"],
        threshold: 0.3,
        includeScore: true,
      }),
    [items]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).slice(0, 30);
  }, [fuse, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const r of results) {
      const type = r.item.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(r.item);
    }
    return groups;
  }, [results]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search diseases, genes, exposures, pathways..."
        className="w-full rounded-md border border-white/[0.1] bg-navy-mid px-4 py-3 text-surface-white placeholder:text-cool-dark focus:outline-none focus:ring-2 focus:ring-teal-primary/50 text-base"
        autoFocus
      />

      {query.trim() && results.length === 0 && (
        <p className="text-cool-mid text-sm mt-6">
          No results found for &ldquo;{query}&rdquo;
        </p>
      )}

      {Object.entries(grouped).map(([type, typeItems]) => (
        <div key={type} className="mt-8">
          <h2 className="text-h3 text-surface-white mb-3">
            {TYPE_LABELS[type] ?? type}s
          </h2>
          <div className="space-y-2">
            {typeItems.map((item) => (
              <Link
                key={item.slug}
                href={getHref(item)}
                className="block card no-underline hover:no-underline group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-sm font-medium ${TYPE_COLORS[item.type] ?? ""}`}
                  >
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                  <span className="text-surface-white font-medium group-hover:text-teal-primary transition-colors">
                    {item.name}
                  </span>
                </div>
                {item.summary && (
                  <p className="text-cool-mid text-sm mt-1 line-clamp-2">
                    {item.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
