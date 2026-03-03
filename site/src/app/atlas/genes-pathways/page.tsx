import { getAllGenes, getAllPathways } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { GenesPathwaysToggle } from "@/components/GenesPathwaysToggle";

export default function AtlasGenesPathwaysPage() {
  const genes = getAllGenes();
  const pathways = getAllPathways();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs
          items={[
            { label: "Atlas", href: "/atlas" },
            { label: "Genes & Pathways", href: "/atlas/genes-pathways" },
          ]}
        />
        <h1 className="text-h1 text-surface-white">Genes & Pathways</h1>
        <p className="text-cool-light max-w-2xl">
          Browse genes and biological pathways in the GENARCH atlas. Toggle
          between gene and pathway lists. Population-level summaries for
          educational use only; not for individual risk assessment.
        </p>
        <GenesPathwaysToggle genes={genes} pathways={pathways} />
      </div>
    </div>
  );
}
