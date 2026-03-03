import Link from "next/link";

import { getReleases, listDiseases, listExposures, listGenes, listPathways } from "@/lib/data";
import { listBriefSlugs } from "@/lib/mdx";

export default async function HomePage(): Promise<JSX.Element> {
  const [diseases, exposures, genes, pathways, releases, briefs] = await Promise.all([
    listDiseases(),
    listExposures(),
    listGenes(),
    listPathways(),
    getReleases(),
    listBriefSlugs()
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-card border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold text-textPrimary">Mapping Gene-Environment Interactions</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-textSecondary">
          GENARCH is a read-only scientific atlas connecting exposures, genetic architecture, molecular
          pathways, and community-level epidemiology. All outputs are educational and population-level.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/atlas"
            className="rounded bg-action px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
          >
            Explore the Atlas
          </Link>
          <Link
            href="/methods"
            className="rounded border border-action px-4 py-2 text-sm font-semibold text-action no-underline hover:bg-orange-50"
          >
            Learn About GENARCH
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="content-card">
          <h2 className="section-title">Genetic Epidemiology</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Curated disease and exposure pages with population-level evidence and citations.
          </p>
          <p className="mt-2 text-xs text-textSecondary">
            {diseases.length} disease • {exposures.length} exposure
          </p>
        </div>
        <div className="content-card">
          <h2 className="section-title">Molecular Translation</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Gene and pathway templates connect statistical associations to mechanistic hypotheses.
          </p>
          <p className="mt-2 text-xs text-textSecondary">
            {genes.length} gene • {pathways.length} pathway
          </p>
        </div>
        <div className="content-card">
          <h2 className="section-title">Bioinformatics Engine</h2>
          <p className="mt-2 text-sm text-textSecondary">
            Deterministic pipeline with strict schema validation and reproducible annual report generation.
          </p>
          <p className="mt-2 text-xs text-textSecondary">Validation blocks build on schema errors.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Latest Mechanism Briefs</h2>
          <ul className="mt-3 space-y-2 text-sm text-textSecondary">
            {briefs.map((slug) => (
              <li key={slug}>
                <Link href={`/mechanism-briefs/${slug}`} className="font-medium">
                  {slug.replaceAll("-", " ")}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="content-card">
          <h2 className="section-title">Latest Reports</h2>
          <ul className="mt-3 space-y-2 text-sm text-textSecondary">
            {releases.releases.slice(0, 5).map((release) => (
              <li key={release.slug}>
                <Link href={release.report_path} className="font-medium">
                  {release.title}
                </Link>
                <span className="ml-2">{release.date}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
