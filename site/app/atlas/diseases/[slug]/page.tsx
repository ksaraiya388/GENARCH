import Link from "next/link";
import { notFound } from "next/navigation";

import { RiskShiftChart } from "@/components/charts/RiskShiftChart";
import { TissueRelevanceHeatmap } from "@/components/charts/TissueRelevanceHeatmap";
import { Citations } from "@/components/common/Citations";
import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { getDisease, listDiseases, listExposures, listGenes, listPathways } from "@/lib/data";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const diseases = await listDiseases();
  return diseases.map((disease) => ({ slug: disease.slug }));
}

export default async function DiseaseDetailPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const [disease, exposures, genes, pathways] = await Promise.all([
    getDisease(params.slug),
    listExposures(),
    listGenes(),
    listPathways()
  ]);
  if (!disease) notFound();

  const exposureNameBySlug = new Map(exposures.map((exposure) => [exposure.slug, exposure.name]));
  const geneNameBySlug = new Map(genes.map((gene) => [gene.slug, gene.symbol]));
  const pathwayNameBySlug = new Map(pathways.map((pathway) => [pathway.slug, pathway.name]));

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
        <h2 className="section-title">Overview</h2>
        <div className="mt-3 grid gap-2 text-sm text-textSecondary md:grid-cols-2">
          <p>
            <strong>Category:</strong> {disease.disease_category}
          </p>
          <p>
            <strong>ICD-11:</strong> {disease.icd11_code}
          </p>
          <p>
            <strong>ICD-10:</strong> {disease.icd10_codes.join(", ")}
          </p>
          <p>
            <strong>Inheritance:</strong> {disease.inheritance_pattern}
          </p>
          <p>
            <strong>Prevalence:</strong> {disease.prevalence_global}
          </p>
          <p>
            <strong>Age of onset:</strong> {disease.age_of_onset_distribution}
          </p>
          <p>
            <strong>Sex bias:</strong> {disease.sex_bias}
          </p>
          <p>
            <strong>Tissue systems:</strong> {disease.tissue_system.join(", ")}
          </p>
        </div>
        <p className="mt-3 text-sm text-textSecondary">{disease.primary_pathophysiology}</p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Genetic architecture summary</h2>
        <p className="mt-2 text-sm text-textSecondary">{disease.genetic_architecture.prs_notes}</p>
        <p className="mt-2 text-sm text-textSecondary">
          Heritability estimate: {disease.heritability_estimate} ({disease.genetic_architecture_type})
        </p>
        <p className="mt-1 text-sm text-textSecondary">
          Polygenic risk support: {disease.polygenic_risk_score_supported ? "supported" : "not supported"}
        </p>
        {disease.validated_prs_studies.length ? (
          <p className="mt-1 text-sm text-textSecondary">
            Validated PRS studies: {disease.validated_prs_studies.join("; ")}
          </p>
        ) : null}
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
                    <Link href={`/atlas/genes/${locus.gene}`}>
                      {geneNameBySlug.get(locus.gene) ?? locus.gene.toUpperCase()}
                    </Link>
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
        <h2 className="section-title">Environmental drivers</h2>
        <p className="mt-2 text-sm text-textSecondary">
          Canonical exposure links:{" "}
          {disease.environmental_exposures
            .map((slug) => exposureNameBySlug.get(slug) ?? slug)
            .join(", ")}
        </p>
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

      <section className="content-card">
        <h2 className="section-title">Gene-environment interaction map</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2">Major gene</th>
                <th className="border border-slate-200 px-3 py-2">Exposure context</th>
                <th className="border border-slate-200 px-3 py-2">Causal pathways</th>
              </tr>
            </thead>
            <tbody>
              {disease.major_genes.map((geneSlug) => (
                <tr key={geneSlug}>
                  <td className="border border-slate-200 px-3 py-2">
                    <Link href={`/atlas/genes/${geneSlug}`}>{geneNameBySlug.get(geneSlug) ?? geneSlug}</Link>
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {disease.environmental_exposures
                      .map((slug) => exposureNameBySlug.get(slug) ?? slug)
                      .join(", ")}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {disease.causal_pathways
                      .map((slug) => pathwayNameBySlug.get(slug) ?? slug)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {disease.gene_environment_interactions.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
            {disease.gene_environment_interactions.map((interaction) => (
              <li key={interaction}>{interaction}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <RiskShiftChart disease={disease} />
      <TissueRelevanceHeatmap disease={disease} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Biomarker panel</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
            {disease.biomarkers_clinical.map((marker) => (
              <li key={marker}>{marker}</li>
            ))}
          </ul>
        </div>
        <div className="content-card">
          <h2 className="section-title">Pharmacogenomics</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
            {disease.pharmacogenomic_markers.length ? (
              disease.pharmacogenomic_markers.map((marker) => <li key={marker}>{marker}</li>)
            ) : (
              <li>No disease-specific pharmacogenomic marker curated in this release.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="content-card">
        <h2 className="section-title">Prevention levers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          {disease.prevention_strategies.map((strategy) => (
            <li key={strategy}>{strategy}</li>
          ))}
        </ul>
      </section>

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
