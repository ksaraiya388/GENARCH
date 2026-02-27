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
          <h1 className="text-h1 text-genarch-text">{gene.symbol}</h1>
          <ConfidenceBadge tier={toConfidenceTier(gene.confidence)} />
        </div>
        {gene.name && (
          <p className="text-genarch-subtext">{gene.name}</p>
        )}
        {gene.chromosome && (
          <p className="text-sm text-genarch-subtext">
            Chromosome: {gene.chromosome}
          </p>
        )}
      </header>

      {/* Gene Overview */}
      <section aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="text-h2 text-genarch-text mb-3">
          Gene Overview
        </h2>
        <p className="text-genarch-text">{gene.summary}</p>
      </section>

      {/* Molecular Function */}
      <section aria-labelledby="molecular-function-heading">
        <h2 id="molecular-function-heading" className="text-h2 text-genarch-text mb-3">
          Molecular Function
        </h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-genarch-text">
          {(gene.molecular_function ?? []).map((fn, i) => (
            <li key={i}>{fn}</li>
          ))}
        </ul>
        {gene.protein_class && (
          <p className="mt-2 text-sm text-genarch-subtext">
            <strong>Protein class:</strong> {gene.protein_class}
          </p>
        )}
        {(!gene.molecular_function || gene.molecular_function.length === 0) &&
          !gene.protein_class && (
            <p className="text-sm text-genarch-subtext italic">
              No molecular function data recorded.
            </p>
          )}
      </section>

      {/* Regulatory Annotation */}
      {gene.regulatory_notes && (
        <section aria-labelledby="regulatory-heading">
          <h2 id="regulatory-heading" className="text-h2 text-genarch-text mb-3">
            Regulatory Annotation
          </h2>
          <div className="space-y-2 text-sm text-genarch-text">
            {gene.regulatory_notes.promoter_activity && (
              <p><strong>Promoter activity:</strong> {gene.regulatory_notes.promoter_activity}</p>
            )}
            {gene.regulatory_notes.enhancer_associations && (
              <p><strong>Enhancer associations:</strong> {gene.regulatory_notes.enhancer_associations}</p>
            )}
            {gene.regulatory_notes.methylation_sensitivity && (
              <p><strong>Methylation sensitivity:</strong> {gene.regulatory_notes.methylation_sensitivity}</p>
            )}
            {gene.regulatory_notes.eqtl_tissues &&
              gene.regulatory_notes.eqtl_tissues.length > 0 && (
                <p>
                  <strong>eQTL tissues:</strong>{" "}
                  {gene.regulatory_notes.eqtl_tissues.join(", ")}
                </p>
              )}
          </div>
        </section>
      )}

      {/* Tissue Expression Context */}
      <section aria-labelledby="expression-heading">
        <h2 id="expression-heading" className="text-h2 text-genarch-text mb-3">
          Tissue Expression Context
        </h2>
        {gene.expression_context && gene.expression_context.length > 0 ? (
          <div className="space-y-2">
            {gene.expression_context.map((ex, i) => (
              <div key={i} className="card">
                <span className="font-medium text-genarch-text">{ex.tissue}</span>
                {ex.tpm_range && (
                  <span className="text-genarch-subtext ml-2">
                    TPM range: {ex.tpm_range}
                  </span>
                )}
                {ex.gtex_version && (
                  <span className="text-genarch-subtext ml-2">
                    GTEx v{ex.gtex_version}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No tissue expression data recorded.
          </p>
        )}
      </section>

      {/* Pathways (linked) */}
      <section aria-labelledby="pathways-heading">
        <h2 id="pathways-heading" className="text-h2 text-genarch-text mb-3">
          Pathways
        </h2>
        {gene.pathways && gene.pathways.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {gene.pathways.map((pSlug, i) => (
              <li key={i}>
                <Link
                  href={`/atlas/pathways/${pSlug}`}
                  className="inline-block rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm text-genarch-link hover:bg-genarch-bg transition-colors"
                >
                  {pSlug}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No pathways linked.
          </p>
        )}
      </section>

      {/* Linked Diseases & Exposures */}
      <section aria-labelledby="linked-heading">
        <h2 id="linked-heading" className="text-h2 text-genarch-text mb-3">
          Linked Diseases & Exposures
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-h3 text-genarch-text mb-2">Diseases</h3>
            {gene.linked_diseases && gene.linked_diseases.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {gene.linked_diseases.map((ld, i) => (
                  <li key={i}>
                    <Link
                      href={`/atlas/diseases/${ld.disease_slug}`}
                      className="text-genarch-link hover:underline"
                    >
                      {ld.disease_slug}
                    </Link>
                    <span className="text-genarch-subtext ml-1">
                      — {ld.evidence_type}, strength {ld.strength}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-genarch-subtext italic">None</p>
            )}
          </div>
          <div>
            <h3 className="text-h3 text-genarch-text mb-2">Exposures</h3>
            {gene.linked_exposures && gene.linked_exposures.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {gene.linked_exposures.map((le, i) => (
                  <li key={i}>
                    <Link
                      href={`/atlas/exposures/${le.exposure_slug}`}
                      className="text-genarch-link hover:underline"
                    >
                      {le.exposure_slug}
                    </Link>
                    <span className="text-genarch-subtext ml-1">
                      — {le.evidence_type}, strength {le.strength}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-genarch-subtext italic">None</p>
            )}
          </div>
        </div>
      </section>

      {/* Mechanistic Hypotheses */}
      <section aria-labelledby="hypotheses-heading">
        <h2 id="hypotheses-heading" className="text-h2 text-genarch-text mb-3">
          Mechanistic Hypotheses
        </h2>
        {gene.mechanistic_hypotheses && gene.mechanistic_hypotheses.length > 0 ? (
          <div className="space-y-3">
            {gene.mechanistic_hypotheses.map((h, i) => (
              <div key={i} className="card">
                <p className="text-genarch-text">{h.hypothesis}</p>
                <p className="text-sm text-genarch-subtext mt-1">
                  {h.supporting_evidence}
                </p>
                <span className="mt-2 inline-block">
                  <ConfidenceBadge tier={toConfidenceTier(h.confidence)} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No mechanistic hypotheses recorded.
          </p>
        )}
      </section>

      {/* Confidence Rating */}
      <section aria-labelledby="confidence-heading">
        <h2 id="confidence-heading" className="text-h2 text-genarch-text mb-3">
          Confidence Rating
        </h2>
        <p className="text-sm text-genarch-subtext">
          Overall evidence confidence for this gene entry:{" "}
          <ConfidenceBadge tier={toConfidenceTier(gene.confidence)} />
        </p>
      </section>

      {/* Evidence & Limitations */}
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

      {/* Citations */}
      <CitationRenderer references={refs} />
    </article>
  );
}
