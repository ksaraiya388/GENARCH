import Link from "next/link";
import { notFound } from "next/navigation";

import { Citations } from "@/components/common/Citations";
import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { getGene, listDiseases, listExposures, listGenes, listPathways } from "@/lib/data";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const genes = await listGenes();
  return genes.map((gene) => ({ slug: gene.slug }));
}

export default async function GeneDetailPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const [gene, diseases, exposures, pathways] = await Promise.all([
    getGene(params.slug),
    listDiseases(),
    listExposures(),
    listPathways()
  ]);
  if (!gene) notFound();

  const diseaseMap = new Map(diseases.map((entry) => [entry.slug, entry]));
  const exposureMap = new Map(exposures.map((entry) => [entry.slug, entry]));
  const pathwayMap = new Map(pathways.map((entry) => [entry.slug, entry]));

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">
          {gene.symbol} <span className="text-lg font-normal text-textSecondary">({gene.name})</span>
        </h1>
        <p className="mt-2 text-sm text-textSecondary">Chromosome: {gene.chromosome}</p>
        <p className="mt-3 text-textSecondary">{gene.summary}</p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Molecular function</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          {gene.molecular_function.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm text-textSecondary">
          <strong>Protein class:</strong> {gene.protein_class}
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Regulatory annotation summary</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>{gene.regulatory_notes.promoter_activity}</li>
          <li>{gene.regulatory_notes.enhancer_associations}</li>
          <li>{gene.regulatory_notes.methylation_sensitivity}</li>
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Tissue expression context</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2">Tissue</th>
                <th className="border border-slate-200 px-3 py-2">TPM range</th>
                <th className="border border-slate-200 px-3 py-2">GTEx version</th>
              </tr>
            </thead>
            <tbody>
              {gene.expression_context.map((context) => (
                <tr key={context.tissue}>
                  <td className="border border-slate-200 px-3 py-2">{context.tissue}</td>
                  <td className="border border-slate-200 px-3 py-2">{context.tpm_range}</td>
                  <td className="border border-slate-200 px-3 py-2">{context.gtex_version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Linked pathways</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm">
          {gene.pathways.map((pathway) => (
            <li key={pathway.slug}>
              <Link href={`/atlas/pathways/${pathway.slug}`}>
                {pathwayMap.get(pathway.slug)?.name ?? pathway.slug}
              </Link>{" "}
              ({pathway.evidence_type}, strength {pathway.strength.toFixed(2)})
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Related diseases</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {gene.linked_diseases.map((disease) => (
              <li key={disease.slug}>
                <Link href={`/atlas/diseases/${disease.slug}`}>
                  {diseaseMap.get(disease.slug)?.name ?? disease.slug}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="content-card">
          <h2 className="section-title">Related exposures</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {gene.linked_exposures.map((exposure) => (
              <li key={exposure.slug}>
                <Link href={`/atlas/exposures/${exposure.slug}`}>
                  {exposureMap.get(exposure.slug)?.name ?? exposure.slug}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Mechanistic hypotheses</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {gene.mechanistic_hypotheses.map((hypothesis) => (
            <li key={hypothesis.hypothesis} className="rounded border border-slate-200 p-3">
              <p className="font-medium">{hypothesis.hypothesis}</p>
              <p className="mt-1 text-textSecondary">{hypothesis.supporting_evidence}</p>
              <p className="mt-1 text-xs text-textSecondary">Confidence: {hypothesis.confidence}</p>
            </li>
          ))}
        </ul>
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
              {gene.evidence_table.map((row) => (
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
      <Citations references={gene.references} />
    </div>
  );
}
