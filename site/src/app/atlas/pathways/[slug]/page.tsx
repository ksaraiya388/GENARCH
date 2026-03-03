import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPathway,
  getAllPathways,
} from "@/lib/data";
import type { Reference } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import { CitationRenderer } from "@/components/CitationRenderer";

function ensureRefAuthors(refs: Reference[]) {
  return refs.map((r) => ({
    ...r,
    authors: r.authors ?? "Unknown",
  }));
}

export async function generateStaticParams() {
  const pathways = getAllPathways();
  return pathways.map((p) => ({ slug: p.slug }));
}

export default async function PathwayDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pathway = getPathway(slug);
  if (!pathway) notFound();

  const refs = ensureRefAuthors(pathway.references ?? []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs
          items={[
            { label: "Atlas", href: "/atlas" },
            { label: "Genes & Pathways", href: "/atlas/genes-pathways" },
            { label: pathway.name },
          ]}
        />

        <header>
          <h1 className="text-h1 text-surface-white">{pathway.name}</h1>
          {pathway.canonical_source && (
            <p className="text-sm text-cool-mid mt-1">
              Canonical source: {pathway.canonical_source}
            </p>
          )}
        </header>

        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="text-h2 text-surface-white mb-3">
            Pathway Overview
          </h2>
          <p className="text-cool-light">{pathway.summary}</p>
        </section>

        <section aria-labelledby="environmental-triggers-heading">
          <h2 id="environmental-triggers-heading" className="text-h2 text-surface-white mb-3">
            Environmental Triggers
          </h2>
          {pathway.environmental_triggers &&
          pathway.environmental_triggers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
                <thead className="bg-white/[0.03]">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-surface-white">Exposure</th>
                    <th className="text-left px-4 py-2 font-medium text-surface-white">Trigger type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {pathway.environmental_triggers.map((et, i) => (
                    <tr key={i} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-2">
                        <Link
                          href={`/atlas/exposures/${et.exposure_slug}`}
                          className="text-teal-primary hover:text-teal-soft hover:underline"
                        >
                          {et.exposure_slug}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-cool-light">{et.trigger_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-cool-mid italic">
              No environmental triggers recorded.
            </p>
          )}
        </section>

        <section aria-labelledby="genetic-modulation-heading">
          <h2 id="genetic-modulation-heading" className="text-h2 text-surface-white mb-3">
            Genetic Modulation Points
          </h2>
          <div className="space-y-4">
            {pathway.key_genes && pathway.key_genes.length > 0 && (
              <div>
                <h3 className="text-h3 text-surface-white mb-2">Key genes</h3>
                <ul className="space-y-1">
                  {pathway.key_genes.map((kg, i) => (
                    <li key={i}>
                      <Link
                        href={`/atlas/genes/${kg.gene_slug}`}
                        className="text-teal-primary hover:text-teal-soft hover:underline"
                      >
                        {kg.gene_slug}
                      </Link>
                      <span className="text-cool-mid ml-1">
                        — {kg.role_in_pathway}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {pathway.regulatory_checkpoints &&
              pathway.regulatory_checkpoints.length > 0 && (
                <div>
                  <h3 className="text-h3 text-surface-white mb-2">
                    Regulatory checkpoints
                  </h3>
                  <ul className="space-y-2">
                    {pathway.regulatory_checkpoints.map((rc, i) => (
                      <li key={i} className="card">
                        <span className="font-medium text-surface-white">{rc.node}</span>
                        {rc.modulator_genes &&
                          rc.modulator_genes.length > 0 && (
                            <span className="text-cool-mid ml-1">
                              — {rc.modulator_genes.join(", ")}
                            </span>
                          )}
                        {rc.potential_therapeutic_target && (
                          <span className="ml-2 text-xs bg-teal-primary/20 text-teal-primary px-2 py-0.5 rounded-sm">
                            Therapeutic target
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
          {(!pathway.key_genes || pathway.key_genes.length === 0) &&
            (!pathway.regulatory_checkpoints ||
              pathway.regulatory_checkpoints.length === 0) && (
              <p className="text-sm text-cool-mid italic">
                No genetic modulation points recorded.
              </p>
            )}
        </section>

        <section aria-labelledby="tissue-specificity-heading">
          <h2 id="tissue-specificity-heading" className="text-h2 text-surface-white mb-3">
            Tissue Specificity
          </h2>
          {pathway.tissue_specificity && pathway.tissue_specificity.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pathway.tissue_specificity.map((ts, i) => (
                <div
                  key={i}
                  className="rounded-sm border border-white/[0.06] bg-navy-mid px-3 py-2 text-sm"
                >
                  <span className="font-medium text-surface-white">{ts.tissue}</span>
                  {ts.expression_evidence && (
                    <span className="text-cool-mid ml-1">
                      — {ts.expression_evidence}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cool-mid italic">
              No tissue specificity data recorded.
            </p>
          )}
        </section>

        <section aria-labelledby="disease-relevance-heading">
          <h2 id="disease-relevance-heading" className="text-h2 text-surface-white mb-3">
            Disease Relevance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-h3 text-surface-white mb-2">Linked diseases</h3>
              {pathway.linked_diseases && pathway.linked_diseases.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {pathway.linked_diseases.map((ld, i) => (
                    <li key={i}>
                      <Link
                        href={`/atlas/diseases/${ld.disease_slug}`}
                        className="text-teal-primary hover:text-teal-soft hover:underline"
                      >
                        {ld.disease_slug}
                      </Link>
                      <span className="text-cool-mid ml-1">
                        — {ld.pathway_role}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-cool-mid italic">None</p>
              )}
            </div>
            <div>
              <h3 className="text-h3 text-surface-white mb-2">Linked exposures</h3>
              {pathway.linked_exposures && pathway.linked_exposures.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {pathway.linked_exposures.map((le, i) => (
                    <li key={i}>
                      <Link
                        href={`/atlas/exposures/${le.exposure_slug}`}
                        className="text-teal-primary hover:text-teal-soft hover:underline"
                      >
                        {le.exposure_slug}
                      </Link>
                      <span className="text-cool-mid ml-1">
                        — {le.pathway_effect}
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

        <section aria-labelledby="diagram-heading">
          <h2 id="diagram-heading" className="text-h2 text-surface-white mb-3">
            Pathway Diagram
          </h2>
          <div className="rounded-sm border-2 border-dashed border-white/[0.06] bg-white/[0.03] p-12 text-center">
            <p className="text-cool-mid text-sm">
              {pathway.diagram_asset ? (
                <>Diagram asset: {pathway.diagram_asset}</>
              ) : (
                <>
                  Pathway diagram placeholder. A visual representation of this
                  pathway will be integrated when available.
                </>
              )}
            </p>
          </div>
        </section>

        <section aria-labelledby="evidence-nodes-heading">
          <h2 id="evidence-nodes-heading" className="text-h2 text-surface-white mb-3">
            Evidence Nodes
          </h2>
          <p className="text-sm text-cool-mid mb-2">
            Evidence for this pathway is derived from:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-cool-light">
            {pathway.environmental_triggers &&
              pathway.environmental_triggers.length > 0 && (
                <li>
                  {pathway.environmental_triggers.length} environmental trigger(s)
                </li>
              )}
            {pathway.key_genes && pathway.key_genes.length > 0 && (
              <li>{pathway.key_genes.length} key gene(s)</li>
            )}
            {pathway.linked_diseases && pathway.linked_diseases.length > 0 && (
              <li>{pathway.linked_diseases.length} linked disease(s)</li>
            )}
            {pathway.linked_exposures && pathway.linked_exposures.length > 0 && (
              <li>{pathway.linked_exposures.length} linked exposure(s)</li>
            )}
          </ul>
        </section>

        <EvidenceLimitations>
          <p className="mb-2">
            Pathway summaries are population-level and for educational use only.
            They do not imply individual risk or clinical guidance.
          </p>
          <p className="mb-2">
            Environmental triggers and genetic modulation points are derived from
            curated literature. Tissue specificity and disease relevance may
            reflect data availability and sampling biases.
          </p>
          <p>
            Pathway boundaries and canonical sources vary across databases.
            Confidence in pathway–disease links depends on evidence strength.
          </p>
        </EvidenceLimitations>

        <CitationRenderer references={refs} />
      </article>
    </div>
  );
}
