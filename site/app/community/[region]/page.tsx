import Link from "next/link";
import { notFound } from "next/navigation";

import { Citations } from "@/components/common/Citations";
import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { CommunityRegionClient } from "@/components/community/CommunityRegionClient";
import { getCommunityRegion, listCommunityRegions } from "@/lib/data";

export async function generateStaticParams(): Promise<Array<{ region: string }>> {
  const regions = await listCommunityRegions();
  return regions.map((region) => ({ region: region.slug }));
}

export default async function CommunityRegionPage({
  params
}: {
  params: { region: string };
}): Promise<JSX.Element> {
  const region = await getCommunityRegion(params.region);
  if (!region) notFound();

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">{region.name}</h1>
        <p className="mt-2 text-sm text-textSecondary">
          Geo level: {region.geo_level} • FIPS: {region.fips_code}
        </p>
      </section>

      <CommunityRegionClient region={region} />

      <section className="content-card">
        <h2 className="section-title">Model card (inline)</h2>
        <p className="mt-2 text-sm text-textSecondary">{region.model.model_card}</p>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>Intended use: educational interpretation of relative modeled burden drivers.</li>
          <li>Not intended use: diagnosis, triage, treatment advice, or individual-level predictions.</li>
          <li>Training cutoff: {region.model.training_data_cutoff}</li>
          <li>Metrics: {Object.entries(region.model.metrics).map(([k, v]) => `${k}=${v}`).join(", ")}</li>
        </ul>
        <p className="mt-2 text-sm">
          Full model card: <Link href="/methods/model-card">/methods/model-card</Link>
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Educational resources</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {region.resources.map((resource) => (
            <article key={resource.url} className="rounded border border-slate-200 p-3">
              <h3 className="font-semibold">{resource.name}</h3>
              <p className="mt-1 text-sm text-textSecondary">{resource.description}</p>
              <p className="mt-1 text-xs text-textSecondary">{resource.local_relevance}</p>
              <a href={resource.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm">
                Visit resource
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Regional limitations</h2>
        <p className="mt-2 text-sm text-textSecondary">{region.limitations}</p>
      </section>

      <EvidenceLimitations />
      <Citations references={region.references} />
    </div>
  );
}
