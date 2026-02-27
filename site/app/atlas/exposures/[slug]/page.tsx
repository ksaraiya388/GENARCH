import Link from "next/link";
import { notFound } from "next/navigation";

import { Citations } from "@/components/common/Citations";
import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { getExposure, listDiseases, listExposures, listGenes } from "@/lib/data";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const exposures = await listExposures();
  return exposures.map((entry) => ({ slug: entry.slug }));
}

export default async function ExposureDetailPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const [exposure, genes, diseases] = await Promise.all([
    getExposure(params.slug),
    listGenes(),
    listDiseases()
  ]);
  if (!exposure) notFound();

  const geneMap = new Map(genes.map((gene) => [gene.slug, gene]));
  const diseaseMap = new Map(diseases.map((disease) => [disease.slug, disease]));

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">{exposure.name}</h1>
        <p className="mt-3 text-textSecondary">{exposure.definition}</p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Definition &amp; measurable proxies</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          {exposure.proxies.map((proxy) => (
            <li key={proxy.name}>
              {proxy.name} ({proxy.unit}) — {proxy.measurement_method} ({proxy.data_source})
            </li>
          ))}
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Biological systems affected</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {exposure.systems_affected.map((system) => (
            <article key={system.system} className="rounded border border-slate-200 p-3">
              <h3 className="font-semibold text-textPrimary">{system.system}</h3>
              <p className="mt-1 text-sm text-textSecondary">{system.mechanism_summary}</p>
              <p className="mt-1 text-xs text-textSecondary">
                Evidence strength: {system.evidence_strength.toFixed(2)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Sensitive developmental windows</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {exposure.sensitive_windows.map((window) => (
            <li key={window.period} className="rounded border border-slate-200 p-3">
              <p className="font-medium">
                {window.period} ({window.age_range})
              </p>
              <p className="mt-1 text-textSecondary">{window.mechanism_rationale}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">GxE highlights</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {exposure.gxe_highlights.map((highlight) => (
            <li key={`${highlight.gene_slug}-${highlight.disease_slug}`} className="rounded border border-slate-200 p-3">
              <p>
                <Link href={`/atlas/genes/${highlight.gene_slug}`} className="font-medium">
                  {geneMap.get(highlight.gene_slug)?.symbol ?? highlight.gene_slug}
                </Link>{" "}
                ×{" "}
                <Link href={`/atlas/diseases/${highlight.disease_slug}`} className="font-medium">
                  {diseaseMap.get(highlight.disease_slug)?.name ?? highlight.disease_slug}
                </Link>{" "}
                <span className="badge ml-2">{highlight.direction}</span>
              </p>
              <p className="mt-1 text-xs text-textSecondary">Evidence: {highlight.evidence_type}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Tissue-specific notes</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {exposure.tissues.map((tissue) => (
            <span key={tissue.name} className="badge">
              {tissue.name}: {tissue.effect_type}
            </span>
          ))}
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
              {exposure.evidence_table.map((row) => (
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
      <Citations references={exposure.references} />
    </div>
  );
}
