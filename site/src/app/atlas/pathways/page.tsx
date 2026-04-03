import Link from "next/link";
import { getAllPathways } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function PathwaysIndexPage() {
  const pathways = getAllPathways();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "Pathways" },
        ]}
      />
      <h1 className="text-h1 text-surface-white mb-2">Biological Pathways</h1>
      <p className="text-cool-mid text-sm mb-8 max-w-2xl">
        Explore molecular signaling pathways that mediate gene–environment
        interactions, connecting environmental triggers to disease through
        specific genetic modulation points.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pathways.map((p) => (
          <Link
            key={p.slug}
            href={`/atlas/pathways/${p.slug}`}
            className="card no-underline hover:no-underline group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#2F855A] opacity-60 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-surface-white text-base font-semibold mb-2 group-hover:text-teal-primary transition-colors">
              {p.name}
            </h3>
            <p className="text-cool-mid text-xs leading-relaxed line-clamp-3 mb-3">
              {p.summary.slice(0, 160)}...
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-cool-dark">
              <span>{p.key_genes?.length ?? 0} genes</span>
              <span>{p.linked_diseases?.length ?? 0} diseases</span>
              <span>{p.environmental_triggers?.length ?? 0} triggers</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
