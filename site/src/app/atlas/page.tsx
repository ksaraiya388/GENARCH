import Link from "next/link";
import {
  getAllDiseases,
  getAllExposures,
  getAllGenes,
  getAllPathways,
  getSearchIndex,
} from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchBar } from "@/components/SearchBar";
import type { SearchableItem } from "@/components/SearchBar";

function buildSearchItems(
  diseases: ReturnType<typeof getAllDiseases>,
  exposures: ReturnType<typeof getAllExposures>,
  genes: ReturnType<typeof getAllGenes>,
  pathways: ReturnType<typeof getAllPathways>,
  searchIndex: ReturnType<typeof getSearchIndex>
): SearchableItem[] {
  if (searchIndex.length > 0) {
    return searchIndex
      .filter((s) => s.type !== "brief")
      .map((s) => ({
        id: s.slug,
        label: s.name,
        href:
          s.type === "disease"
            ? `/atlas/diseases/${s.slug}`
            : s.type === "exposure"
              ? `/atlas/exposures/${s.slug}`
              : s.type === "gene"
                ? `/atlas/genes/${s.slug}`
                : `/atlas/pathways/${s.slug}`,
        entityType: s.type as SearchableItem["entityType"],
        confidenceTier: s.confidence?.toUpperCase() as
          | "LOW"
          | "MEDIUM"
          | "HIGH"
          | undefined,
        summary: s.summary,
      }));
  }
  const items: SearchableItem[] = [];
  diseases.forEach((d) =>
    items.push({
      id: d.slug,
      label: d.name,
      href: `/atlas/diseases/${d.slug}`,
      entityType: "disease",
      summary: d.summary,
    })
  );
  exposures.forEach((e) =>
    items.push({
      id: e.slug,
      label: e.name,
      href: `/atlas/exposures/${e.slug}`,
      entityType: "exposure",
      summary: e.definition,
    })
  );
  genes.forEach((g) =>
    items.push({
      id: g.slug,
      label: g.symbol,
      href: `/atlas/genes/${g.slug}`,
      entityType: "gene",
      confidenceTier: (g.confidence?.toUpperCase() ?? "LOW") as
        | "LOW"
        | "MEDIUM"
        | "HIGH",
      summary: g.summary,
    })
  );
  pathways.forEach((p) =>
    items.push({
      id: p.slug,
      label: p.name,
      href: `/atlas/pathways/${p.slug}`,
      entityType: "pathway",
      summary: p.summary,
    })
  );
  return items;
}

export default function AtlasPage() {
  const diseases = getAllDiseases();
  const exposures = getAllExposures();
  const genes = getAllGenes();
  const pathways = getAllPathways();
  const searchIndex = getSearchIndex();
  const searchItems = buildSearchItems(
    diseases,
    exposures,
    genes,
    pathways,
    searchIndex
  );

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Atlas", href: "/atlas" }]} />
      <div className="mb-6">
        <SearchBar items={searchItems} placeholder="Search atlas…" />
      </div>
      <h1 className="text-h1 text-genarch-text">Atlas</h1>
      <p className="text-genarch-subtext max-w-2xl">
        Explore the GENARCH atlas — diseases, environmental exposures, genes,
        and pathways. All content is population-level and for educational
        purposes only; not for individual risk assessment.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/atlas/diseases"
          className="card block no-underline transition-shadow hover:shadow-md"
        >
          <div className="text-3xl font-bold text-genarch-primary">
            {diseases.length}
          </div>
          <h2 className="text-h3 text-genarch-text mt-2">Diseases</h2>
          <p className="text-sm text-genarch-subtext mt-1">
            Browse diseases with genetic architecture and exposure modifiers
          </p>
        </Link>
        <Link
          href="/atlas/exposures"
          className="card block no-underline transition-shadow hover:shadow-md"
        >
          <div className="text-3xl font-bold text-genarch-action">
            {exposures.length}
          </div>
          <h2 className="text-h3 text-genarch-text mt-2">Exposures</h2>
          <p className="text-sm text-genarch-subtext mt-1">
            Environmental exposures, proxies, and GxE highlights
          </p>
        </Link>
        <Link
          href="/atlas/genes-pathways"
          className="card block no-underline transition-shadow hover:shadow-md"
        >
          <div className="text-3xl font-bold text-genarch-data">
            {genes.length}
          </div>
          <h2 className="text-h3 text-genarch-text mt-2">Genes</h2>
          <p className="text-sm text-genarch-subtext mt-1">
            Molecular function, regulation, and pathway links
          </p>
        </Link>
        <Link
          href="/atlas/genes-pathways"
          className="card block no-underline transition-shadow hover:shadow-md"
        >
          <div className="text-3xl font-bold text-genarch-community">
            {pathways.length}
          </div>
          <h2 className="text-h3 text-genarch-text mt-2">Pathways</h2>
          <p className="text-sm text-genarch-subtext mt-1">
            Biological pathways and genetic modulation points
          </p>
        </Link>
      </div>
    </div>
  );
}
