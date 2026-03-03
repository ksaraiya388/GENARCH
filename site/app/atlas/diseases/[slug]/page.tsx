import Link from "next/link";
import { notFound } from "next/navigation";

import { RiskShiftChart } from "@/components/charts/RiskShiftChart";
import { TissueRelevanceHeatmap } from "@/components/charts/TissueRelevanceHeatmap";
import { Citations } from "@/components/common/Citations";
import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { getDisease, listDiseases, listExposures } from "@/lib/data";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const diseases = await listDiseases();
  return diseases.map((disease) => ({ slug: disease.slug }));
}

export default async function DiseaseDetailPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const [disease, exposures] = await Promise.all([getDisease(params.slug), listExposures()]);
  if (!disease) notFound();

  const exposureNameBySlug = new Map(exposures.map((exposure) => [exposure.slug, exposure.name]));

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">{disease.name}</h1>
        <p className="mt-3 text-textSecondary">{disease.summary}</p>
        <p className="mt-3 text-sm text-textSecondary">
          <strong>Adolescent relevance:</strong> {disease.adolescent_relevance}
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Genetic architecture summary</h2>
        <p className="mt-2 text-sm text-textSecondary">{disease.genetic_architecture.prs_notes}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2">Gene</th>
                <th className="border border-slate-200 px-3 py-2">Variant</th>
                <th className="border border-slate-200 px-3 py-2">GWAS p</th>
                <th className="border border-slate-200 px-3 py-2">Effect size</th>
                <th className="border border-slate-200 px-3 py-2">Confidence strength</th>
              </tr>
            </thead>
            <tbody>
              {disease.genetic_architecture.top_loci.map((locus) => (
                <tr key={`${locus.gene}-${locus.variant ?? "na"}`}>
                  <td className="border border-slate-200 px-3 py-2">
                    <Link href={`/atlas/genes/${locus.gene}`}>{locus.gene.toUpperCase()}</Link>
                  </td>
                  <td className="border border-slate-200 px-3 py-2">{locus.variant ?? "N/A"}</td>
                  <td className="border border-slate-200 px-3 py-2">{locus.gwas_p.toExponential(2)}</td>
                  <td className="border border-slate-200 px-3 py-2">{locus.effect_size.toFixed(2)}</td>
                  <td className="border border-slate-200 px-3 py-2">{locus.strength.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Exposure modifiers</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {disease.exposure_modifiers.map((modifier) => (
            <li key={modifier.exposure_slug} className="rounded border border-slate-200 p-3">
              <p className="font-medium text-textPrimary">
                <Link href={`/atlas/exposures/${modifier.exposure_slug}`}>
                  {exposureNameBySlug.get(modifier.exposure_slug) ?? modifier.exposure_slug}
                </Link>{" "}
                <span className="badge ml-2">{modifier.direction}</span>
              </p>
              <p className="mt-1 text-textSecondary">{modifier.mechanism_hypothesis}</p>
              <p className="mt-1 text-xs text-textSecondary">
                Strength {modifier.strength.toFixed(2)} • Confidence {modifier.confidence}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <RiskShiftChart disease={disease} />
      <TissueRelevanceHeatmap disease={disease} />

      <section className="content-card">
        <h2 className="section-title">Population limitations</h2>
        <p className="mt-2 text-sm text-textSecondary">
          {disease.population_equity.gwas_ancestry_breakdown}
        </p>
        <p className="mt-2 text-sm text-textSecondary">
          {disease.population_equity.transferability_notes}
        </p>
        <p className="mt-2 text-sm text-textSecondary">{disease.population_equity.data_gaps}</p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Mechanism briefs</h2>
        {disease.mechanism_briefs.length === 0 ? (
          <p className="mt-2 text-sm text-textSecondary">No linked mechanism briefs yet.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {disease.mechanism_briefs.map((slug) => (
              <li key={slug}>
                <Link href={`/mechanism-briefs/${slug}`}>{slug.replaceAll("-", " ")}</Link>
              </li>
            ))}
          </ul>
        )}
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
              {disease.evidence_table.map((row) => (
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
      <Citations references={disease.references} />
    </div>
  );
}
