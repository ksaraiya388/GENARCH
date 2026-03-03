import Link from "next/link";
import { listGenes, listPathways } from "@/lib/data";
import { GenePathwayToggle } from "@/components/atlas/GenePathwayToggle";

export default async function GenesPathwaysPage(): Promise<JSX.Element> {
  const [genes, pathways] = await Promise.all([listGenes(), listPathways()]);
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Genes &amp; Pathways</h1>
        <p className="mt-2 text-textSecondary">
          Toggle between gene and pathway lists with search-based filtering.
        </p>
      </section>
      <GenePathwayToggle genes={genes} pathways={pathways} />
      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/atlas/genes/il33"
          className="content-card no-underline hover:-translate-y-0.5 transition-transform"
        >
          <h2 className="section-title">Gene detail route example</h2>
          <p className="mt-1 text-sm text-textSecondary">/atlas/genes/il33</p>
        </Link>
        <Link
          href="/atlas/pathways/nf-kb-signaling"
          className="content-card no-underline hover:-translate-y-0.5 transition-transform"
        >
          <h2 className="section-title">Pathway detail route example</h2>
          <p className="mt-1 text-sm text-textSecondary">/atlas/pathways/nf-kb-signaling</p>
        </Link>
      </div>
    </div>
  );
}
