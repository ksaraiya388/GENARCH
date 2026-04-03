import { getSearchIndex } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchPageClient } from "./SearchPageClient";

export default function SearchPage() {
  const items = getSearchIndex();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <h1 className="text-h1 text-surface-white mb-2">Search</h1>
      <p className="text-cool-mid text-sm mb-8">
        Search across all diseases, exposures, genes, pathways, and mechanism
        briefs in the GENARCH atlas.
      </p>
      <SearchPageClient items={items} />
    </div>
  );
}
