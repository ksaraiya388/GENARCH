import Link from "next/link";
import { getAllGenes } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

function toTier(c?: string): "LOW" | "MEDIUM" | "HIGH" {
  if (!c) return "LOW";
  const u = c.toUpperCase();
  return u === "HIGH" || u === "MEDIUM" || u === "LOW" ? u : "LOW";
}

export default function GenesIndexPage() {
  const genes = getAllGenes();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "Genes" },
        ]}
      />
      <h1 className="text-h1 text-surface-white mb-2">Genes &amp; Variants</h1>
      <p className="text-cool-mid text-sm mb-8 max-w-2xl">
        Browse genes with curated GWAS associations, expression context, and
        mechanistic hypotheses linking genetic variation to disease through
        environmental modifiers.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {genes.map((g) => (
          <Link
            key={g.slug}
            href={`/atlas/genes/${g.slug}`}
            className="card no-underline hover:no-underline group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-primary opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-surface-white text-base font-semibold">
                {g.symbol}
              </h3>
              <ConfidenceBadge tier={toTier(g.confidence)} />
            </div>
            <p className="text-cool-mid text-xs mb-2">{g.name}</p>
            <p className="text-cool-mid text-xs leading-relaxed line-clamp-3 mb-3">
              {g.summary.slice(0, 140)}...
            </p>
            <div className="flex gap-3 text-xs text-cool-dark">
              <span>{g.linked_diseases?.length ?? 0} diseases</span>
              <span>{g.linked_exposures?.length ?? 0} exposures</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
