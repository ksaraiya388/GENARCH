import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Citations } from "@/components/common/Citations";
import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { getPathway, listDiseases, listExposures, listGenes, listPathways } from "@/lib/data";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const pathways = await listPathways();
  return pathways.map((pathway) => ({ slug: pathway.slug }));
}

export default async function PathwayDetailPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const [pathway, genes, diseases, exposures] = await Promise.all([
    getPathway(params.slug),
    listGenes(),
    listDiseases(),
    listExposures()
  ]);
  if (!pathway) notFound();

  const geneMap = new Map(genes.map((entry) => [entry.slug, entry]));
  const diseaseMap = new Map(diseases.map((entry) => [entry.slug, entry]));
  const exposureMap = new Map(exposures.map((entry) => [entry.slug, entry]));

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">{pathway.name}</h1>
        <p className="mt-3 text-textSecondary">{pathway.summary}</p>
        <p className="mt-2 text-sm text-textSecondary">Canonical source: {pathway.canonical_source}</p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Environmental triggers</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
          {pathway.environmental_triggers.map((trigger) => (
            <li key={`${trigger.exposure_slug}-${trigger.trigger_type}`}>
              <Link href={`/atlas/exposures/${trigger.exposure_slug}`}>
                {exposureMap.get(trigger.exposure_slug)?.name ?? trigger.exposure_slug}
              </Link>
              : {trigger.trigger_type}
            </li>
          ))}
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Genetic modulation points</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
          {pathway.key_genes.map((entry) => (
            <li key={entry.gene_slug}>
              <Link href={`/atlas/genes/${entry.gene_slug}`}>
                {geneMap.get(entry.gene_slug)?.symbol ?? entry.gene_slug}
              </Link>
              : {entry.role_in_pathway}
            </li>
          ))}
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Pathway diagram</h2>
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
          <Image
            src={pathway.diagram_asset}
            alt={`${pathway.name} pathway diagram`}
            width={900}
            height={300}
            className="h-auto w-full"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Linked diseases</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {pathway.linked_diseases.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/atlas/diseases/${entry.slug}`}>
                  {diseaseMap.get(entry.slug)?.name ?? entry.slug}
                </Link>
                {entry.pathway_role ? `: ${entry.pathway_role}` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div className="content-card">
          <h2 className="section-title">Linked exposures</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {pathway.linked_exposures.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/atlas/exposures/${entry.slug}`}>
                  {exposureMap.get(entry.slug)?.name ?? entry.slug}
                </Link>
                {entry.pathway_effect ? `: ${entry.pathway_effect}` : ""}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Evidence table</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2">Evidence item</th>
                <th className="border border-slate-200 px-3 py-2">Type</th>
                <th className="border border-slate-200 px-3 py-2">Source</th>
                <th className="border border-slate-200 px-3 py-2">Year</th>
                <th className="border border-slate-200 px-3 py-2">Effect size</th>
                <th className="border border-slate-200 px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {pathway.evidence_table.map((row) => (
                <tr key={row.label}>
                  <td className="border border-slate-200 px-3 py-2">{row.label}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.evidence_type}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.source}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.year}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.effect_size.toFixed(2)}</td>
                  <td className="border border-slate-200 px-3 py-2">{row.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EvidenceLimitations />
      <Citations references={pathway.references} />
    </div>
  );
}
