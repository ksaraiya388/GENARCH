import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getGene,
  getAllGenes,
} from "@/lib/data";
import type { Reference } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import { CitationRenderer } from "@/components/CitationRenderer";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

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
  const genes = getAllGenes();
  return genes.map((g) => ({ slug: g.slug }));
}

export default async function GeneDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gene = getGene(slug);
  if (!gene) notFound();

  const refs = ensureRefAuthors(gene.references ?? []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs
          items={[
            { label: "Atlas", href: "/atlas" },
            { label: "Genes & Pathways", href: "/atlas/genes-pathways" },
            { label: gene.symbol },
          ]}
        />

        <header>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-h1 text-surface-white">{gene.symbol}</h1>
            <ConfidenceBadge tier={toConfidenceTier(gene.confidence)} />
          </div>
          {gene.name && (
            <p className="text-cool-light">{gene.name}</p>
          )}
          {gene.chromosome && (
            <p className="text-sm text-cool-mid">
              Chromosome: {gene.chromosome}
            </p>
          )}
        </header>

        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="text-h2 text-surface-white mb-3">
            Gene Overview
          </h2>
          <p className="text-cool-light">{gene.summary}</p>
        </section>

        <section aria-labelledby="molecular-function-heading">
          <h2 id="molecular-function-heading" className="text-h2 text-surface-white mb-3">
            Molecular Function
          </h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-cool-light">
            {(gene.molecular_function ?? []).map((fn, i) => (
              <li key={i}>{fn}</li>
            ))}
          </ul>
          {gene.protein_class && (
            <p className="mt-2 text-sm text-cool-mid">
              <strong className="text-surface-white">Protein class:</strong> {gene.protein_class}
            </p>
          )}
          {(!gene.molecular_function || gene.molecular_function.length === 0) &&
            !gene.protein_class && (
              <p className="text-sm text-cool-mid italic">
                No molecular function data recorded.
              </p>
            )}
        </section>

        {gene.regulatory_notes && (
          <section aria-labelledby="regulatory-heading">
            <h2 id="regulatory-heading" className="text-h2 text-surface-white mb-3">
              Regulatory Annotation
            </h2>
            <div className="space-y-2 text-sm text-cool-light">
              {gene.regulatory_notes.promoter_activity && (
                <p><strong className="text-surface-white">Promoter activity:</strong> {gene.regulatory_notes.promoter_activity}</p>
              )}
              {gene.regulatory_notes.enhancer_associations && (
                <p><strong className="text-surface-white">Enhancer associations:</strong> {gene.regulatory_notes.enhancer_associations}</p>
              )}
              {gene.regulatory_notes.methylation_sensitivity && (
                <p><strong className="text-surface-white">Methylation sensitivity:</strong> {gene.regulatory_notes.methylation_sensitivity}</p>
              )}
              {gene.regulatory_notes.eqtl_tissues &&
                gene.regulatory_notes.eqtl_tissues.length > 0 && (
                  <p>
                    <strong className="text-surface-white">eQTL tissues:</strong>{" "}
                    {gene.regulatory_notes.eqtl_tissues.join(", ")}
                  </p>
                )}
            </div>
          </section>
        )}

        <section aria-labelledby="expression-heading">
          <h2 id="expression-heading" className="text-h2 text-surface-white mb-3">
            Tissue Expression Context
          </h2>
          {gene.expression_context && gene.expression_context.length > 0 ? (
            <div className="space-y-2">
              {gene.expression_context.map((ex, i) => (
                <div key={i} className="card">
                  <span className="font-medium text-surface-white">{ex.tissue}</span>
                  {ex.tpm_range && (
                    <span className="text-cool-mid ml-2">
                      TPM range: {ex.tpm_range}
                    </span>
                  )}
                  {ex.gtex_version && (
                    <span className="text-cool-mid ml-2">
                      GTEx v{ex.gtex_version}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cool-mid italic">
              No tissue expression data recorded.
            </p>
          )}
        </section>

        <section aria-labelledby="pathways-heading">
          <h2 id="pathways-heading" className="text-h2 text-surface-white mb-3">
            Pathways
          </h2>
          {gene.pathways && gene.pathways.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {gene.pathways.map((pSlug, i) => (
                <li key={i}>
                  <Link
                    href={`/atlas/pathways/${pSlug}`}
                    className="inline-block rounded-sm border border-white/[0.06] bg-navy-mid px-3 py-2 text-sm text-teal-primary hover:bg-white/[0.04] transition-colors"
                  >
                    {pSlug}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-cool-mid italic">
              No pathways linked.
            </p>
          )}
        </section>

        <section aria-labelledby="linked-heading">
          <h2 id="linked-heading" className="text-h2 text-surface-white mb-3">
            Linked Diseases & Exposures
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-h3 text-surface-white mb-2">Diseases</h3>
              {gene.linked_diseases && gene.linked_diseases.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {gene.linked_diseases.map((ld, i) => (
                    <li key={i}>
                      <Link
                        href={`/atlas/diseases/${ld.disease_slug}`}
                        className="text-teal-primary hover:text-teal-soft hover:underline"
                      >
                        {ld.disease_slug}
                      </Link>
                      <span className="text-cool-mid ml-1">
                        — {ld.evidence_type}, strength {ld.strength}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-cool-mid italic">None</p>
              )}
            </div>
            <div>
              <h3 className="text-h3 text-surface-white mb-2">Exposures</h3>
              {gene.linked_exposures && gene.linked_exposures.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {gene.linked_exposures.map((le, i) => (
                    <li key={i}>
                      <Link
                        href={`/atlas/exposures/${le.exposure_slug}`}
                        className="text-teal-primary hover:text-teal-soft hover:underline"
                      >
                        {le.exposure_slug}
                      </Link>
                      <span className="text-cool-mid ml-1">
                        — {le.evidence_type}, strength {le.strength}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-cool-mid italic">None</p>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="hypotheses-heading">
          <h2 id="hypotheses-heading" className="text-h2 text-surface-white mb-3">
            Mechanistic Hypotheses
          </h2>
          {gene.mechanistic_hypotheses && gene.mechanistic_hypotheses.length > 0 ? (
            <div className="space-y-3">
              {gene.mechanistic_hypotheses.map((h, i) => (
                <div key={i} className="card">
                  <p className="text-cool-light">{h.hypothesis}</p>
                  <p className="text-sm text-cool-mid mt-1">
                    {h.supporting_evidence}
                  </p>
                  <span className="mt-2 inline-block">
                    <ConfidenceBadge tier={toConfidenceTier(h.confidence)} />
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cool-mid italic">
              No mechanistic hypotheses recorded.
            </p>
          )}
        </section>

        <section aria-labelledby="confidence-heading">
          <h2 id="confidence-heading" className="text-h2 text-surface-white mb-3">
            Confidence Rating
          </h2>
          <p className="text-sm text-cool-light">
            Overall evidence confidence for this gene entry:{" "}
            <ConfidenceBadge tier={toConfidenceTier(gene.confidence)} />
          </p>
        </section>

        <EvidenceLimitations>
          <p className="mb-2">
            Gene summaries are population-level and for educational use only. They
            do not imply individual risk or clinical guidance.
          </p>
          <p className="mb-2">
            Molecular function and regulatory annotations are derived from
            curated literature. Tissue expression and pathway links may reflect
            data availability biases.
          </p>
          <p>
            Confidence ratings indicate evidence strength across the curated
            literature, not certainty for any specific population or setting.
          </p>
        </EvidenceLimitations>

        <CitationRenderer references={refs} />
      </article>
    </div>
  );
}
