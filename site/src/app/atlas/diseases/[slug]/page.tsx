import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDisease,
  getAllDiseases,
} from "@/lib/data";
import type { Reference } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import { CitationRenderer } from "@/components/CitationRenderer";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { RiskShiftChart } from "@/components/RiskShiftChart";
import { TissueRelevanceChart } from "@/components/TissueRelevanceChart";

function toConfidenceTier(c?: string): "LOW" | "MEDIUM" | "HIGH" {
  if (!c) return "LOW";
  const u = c.toUpperCase();
  return u === "HIGH" || u === "MEDIUM" || u === "LOW" ? u : "LOW";
}

function ensureRefAuthors(refs: Reference[]) {
  return refs.map((r) => ({
    ...r,
    authors: r.authors ?? "Unknown",
  }));
}

export async function generateStaticParams() {
  const diseases = getAllDiseases();
  return diseases.map((d) => ({ slug: d.slug }));
}

export default async function DiseaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const disease = getDisease(slug);
  if (!disease) notFound();

  const refs = ensureRefAuthors(disease.references ?? []);

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "Diseases", href: "/atlas/diseases" },
          { label: disease.name },
        ]}
      />

      <header>
        <h1 className="text-h1 text-genarch-text">{disease.name}</h1>
        {disease.icd11_code && (
          <p className="text-genarch-subtext text-sm mt-1">
            ICD-11: {disease.icd11_code}
          </p>
        )}
      </header>

      {/* Disease Overview (200–300 words) */}
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="text-h2 text-genarch-text mb-3">
          Disease Overview
        </h2>
        <div className="prose prose-sm max-w-none text-genarch-text">
          <p>{disease.summary}</p>
          {disease.adolescent_relevance && (
            <p>{disease.adolescent_relevance}</p>
          )}
        </div>
      </section>

      {/* Genetic Architecture Summary */}
      <section aria-labelledby="genetic-architecture-heading">
        <h2 id="genetic-architecture-heading" className="text-h2 text-genarch-text mb-3">
          Genetic Architecture Summary
        </h2>
        <div className="space-y-4">
          {disease.genetic_architecture?.top_loci &&
            disease.genetic_architecture.top_loci.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-sm overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Gene</th>
                      <th className="text-left px-4 py-2 font-medium">Variant</th>
                      <th className="text-left px-4 py-2 font-medium">GWAS p</th>
                      <th className="text-left px-4 py-2 font-medium">Evidence</th>
                      <th className="text-left px-4 py-2 font-medium">Strength</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {disease.genetic_architecture.top_loci.map((locus, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2">
                          <Link
                            href={`/atlas/genes/${locus.gene.toLowerCase()}`}
                            className="text-genarch-link hover:underline"
                          >
                            {locus.gene}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-genarch-subtext">
                          {locus.variant ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-genarch-subtext">
                          {locus.gwas_p != null
                            ? locus.gwas_p.toExponential(1)
                            : "—"}
                        </td>
                        <td className="px-4 py-2">{locus.evidence}</td>
                        <td className="px-4 py-2">{locus.strength}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          {disease.genetic_architecture?.heritability_estimate && (
            <div className="card bg-genarch-bg/50">
              <h3 className="text-h3 text-genarch-text mb-2">
                Heritability
              </h3>
              <p className="text-sm text-genarch-subtext">
                h² SNP: {disease.genetic_architecture.heritability_estimate.h2_snp}
                {disease.genetic_architecture.heritability_estimate.h2_narrow_sense != null &&
                  `; h² narrow-sense: ${disease.genetic_architecture.heritability_estimate.h2_narrow_sense}`}{" "}
                — {disease.genetic_architecture.heritability_estimate.source} (
                {disease.genetic_architecture.heritability_estimate.year})
              </p>
            </div>
          )}
          {disease.genetic_architecture?.prs_notes && (
            <p className="text-sm text-genarch-subtext">
              <strong>PRS notes:</strong> {disease.genetic_architecture.prs_notes}
            </p>
          )}
        </div>
      </section>

      {/* Exposure Modifier Panel */}
      <section aria-labelledby="exposure-modifiers-heading">
        <h2 id="exposure-modifiers-heading" className="text-h2 text-genarch-text mb-3">
          Exposure Modifier Panel
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-sm overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Exposure</th>
                <th className="text-left px-4 py-2 font-medium">Direction</th>
                <th className="text-left px-4 py-2 font-medium">Strength</th>
                <th className="text-left px-4 py-2 font-medium">Confidence</th>
                <th className="text-left px-4 py-2 font-medium">Mechanism hypothesis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(disease.exposure_modifiers ?? []).map((em, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/atlas/exposures/${em.exposure_slug}`}
                      className="text-genarch-link hover:underline"
                    >
                      {em.exposure_slug}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{em.direction}</td>
                  <td className="px-4 py-2">{em.strength}</td>
                  <td className="px-4 py-2">
                    <ConfidenceBadge tier={toConfidenceTier(em.confidence)} />
                  </td>
                  <td className="px-4 py-2 text-genarch-subtext">
                    {em.mechanism_hypothesis ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!disease.exposure_modifiers || disease.exposure_modifiers.length === 0) && (
          <p className="text-sm text-genarch-subtext italic">
            No exposure modifiers recorded for this disease.
          </p>
        )}
      </section>

      {/* Population Equity Notes */}
      {disease.population_equity && (
        <section aria-labelledby="population-equity-heading">
          <h2 id="population-equity-heading" className="text-h2 text-genarch-text mb-3">
            Population Equity Notes
          </h2>
          <div className="space-y-2 text-sm text-genarch-text">
            <p>
              <strong>GWAS ancestry breakdown:</strong>{" "}
              {disease.population_equity.gwas_ancestry_breakdown}
            </p>
            <p>
              <strong>Transferability notes:</strong>{" "}
              {disease.population_equity.transferability_notes}
            </p>
            <p>
              <strong>Data gaps:</strong>{" "}
              {disease.population_equity.data_gaps}
            </p>
          </div>
        </section>
      )}

      {/* Tissue Context */}
      {disease.tissues && disease.tissues.length > 0 && (
        <section aria-labelledby="tissue-context-heading">
          <h2 id="tissue-context-heading" className="text-h2 text-genarch-text mb-3">
            Tissue Context
          </h2>
          <div className="flex flex-wrap gap-3">
            {disease.tissues.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-sm border border-gray-200 bg-white px-3 py-2"
              >
                <span className="text-sm font-medium text-genarch-text">
                  {t.name}
                </span>
                <span
                  className="inline-block h-4 rounded-sm bg-genarch-data/50 min-w-[48px]"
                  style={{
                    width: `${Math.min(100, t.relevance_score * 100)}px`,
                  }}
                  title={`Relevance: ${t.relevance_score}`}
                  aria-hidden
                />
                <span className="text-xs text-genarch-subtext">
                  {t.relevance_score.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mechanism Brief Links */}
      {disease.mechanism_briefs && disease.mechanism_briefs.length > 0 && (
        <section aria-labelledby="mechanism-briefs-heading">
          <h2 id="mechanism-briefs-heading" className="text-h2 text-genarch-text mb-3">
            Mechanism Brief Links
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {disease.mechanism_briefs.map((slug, i) => (
              <li key={i}>
                <Link
                  href={`/mechanism-briefs/${slug}`}
                  className="text-genarch-link hover:underline"
                >
                  {slug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Required Visualizations */}
      <section aria-labelledby="visualizations-heading">
        <h2 id="visualizations-heading" className="text-h2 text-genarch-text mb-3">
          Visualizations
        </h2>
        <div className="space-y-8">
          <RiskShiftChart
            diseaseName={disease.slug}
            modifiers={(disease.exposure_modifiers ?? []).map((m) => ({
              exposure_slug: m.exposure_slug,
              direction: m.direction,
              strength: m.strength,
              confidence: m.confidence,
              mechanism_hypothesis: m.mechanism_hypothesis,
            }))}
          />
          <TissueRelevanceChart
            diseaseName={disease.slug}
            tissues={(disease.tissues ?? []).map((t) => ({
              name: t.name,
              relevance_score: t.relevance_score,
              evidence_type: t.evidence_type,
            }))}
          />
        </div>
      </section>

      {/* Evidence & Limitations — always visible, never collapsible */}
      <EvidenceLimitations>
        <p className="mb-2">
          This atlas presents population-level summaries for educational
          purposes. Findings do not imply individual risk or clinical guidance.
        </p>
        <p className="mb-2">
          Genetic architecture and exposure modifiers are derived from curated
          literature and may reflect ancestry and sampling biases. Confidence
          ratings indicate evidence strength, not certainty.
        </p>
        <p>
          Data gaps in population equity notes highlight areas where
          transferability across ancestries or settings remains uncertain.
        </p>
      </EvidenceLimitations>

      {/* Citations */}
      <CitationRenderer references={refs} />
    </article>
  );
}
