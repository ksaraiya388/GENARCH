import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getExposure,
  getAllExposures,
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
  const exposures = getAllExposures();
  return exposures.map((e) => ({ slug: e.slug }));
}

export default async function ExposureDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exposure = getExposure(slug);
  if (!exposure) notFound();

  const refs = ensureRefAuthors(exposure.references ?? []);

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: "Atlas", href: "/atlas" },
          { label: "Exposures", href: "/atlas/exposures" },
          { label: exposure.name },
        ]}
      />

      <header>
        <h1 className="text-h1 text-genarch-text">{exposure.name}</h1>
      </header>

      {/* Exposure Definition + Proxies */}
      <section aria-labelledby="definition-heading">
        <h2 id="definition-heading" className="text-h2 text-genarch-text mb-3">
          Exposure Definition
        </h2>
        <p className="text-genarch-text mb-4">{exposure.definition}</p>
        {exposure.proxies && exposure.proxies.length > 0 && (
          <div>
            <h3 className="text-h3 text-genarch-text mb-2">Proxies</h3>
            <table className="min-w-full text-sm border border-gray-200 rounded-sm overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Unit</th>
                  <th className="text-left px-4 py-2 font-medium">Measurement</th>
                  <th className="text-left px-4 py-2 font-medium">Data source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exposure.proxies.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2 text-genarch-subtext">{p.unit}</td>
                    <td className="px-4 py-2 text-genarch-subtext">
                      {p.measurement_method ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-genarch-subtext">
                      {p.data_source ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Data Sources */}
      {exposure.exposure_distribution && (
        <section aria-labelledby="data-sources-heading">
          <h2 id="data-sources-heading" className="text-h2 text-genarch-text mb-3">
            Data Sources
          </h2>
          <div className="card bg-genarch-bg/50 text-sm">
            <p>
              <strong>Data source:</strong>{" "}
              {exposure.exposure_distribution.data_source}
            </p>
            <p>
              <strong>Geographic scope:</strong>{" "}
              {exposure.exposure_distribution.geographic_scope}
            </p>
            {exposure.exposure_distribution.summary_stats &&
              Object.keys(exposure.exposure_distribution.summary_stats).length > 0 && (
                <div className="mt-2">
                  <strong>Summary stats:</strong>{" "}
                  {JSON.stringify(exposure.exposure_distribution.summary_stats)}
                </div>
              )}
          </div>
        </section>
      )}

      {/* Biological Systems Affected */}
      <section aria-labelledby="systems-affected-heading">
        <h2 id="systems-affected-heading" className="text-h2 text-genarch-text mb-3">
          Biological Systems Affected
        </h2>
        {exposure.systems_affected && exposure.systems_affected.length > 0 ? (
          <div className="space-y-3">
            {exposure.systems_affected.map((s, i) => (
              <div key={i} className="card">
                <h3 className="text-h3 text-genarch-text mb-1">{s.system}</h3>
                <p className="text-sm text-genarch-subtext">{s.mechanism_summary}</p>
                {s.evidence_strength != null && (
                  <p className="text-xs text-genarch-subtext mt-1">
                    Evidence strength: {s.evidence_strength}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No biological systems data recorded.
          </p>
        )}
      </section>

      {/* Sensitive Developmental Windows */}
      <section aria-labelledby="sensitive-windows-heading">
        <h2 id="sensitive-windows-heading" className="text-h2 text-genarch-text mb-3">
          Sensitive Developmental Windows
        </h2>
        {exposure.sensitive_windows && exposure.sensitive_windows.length > 0 ? (
          <div className="space-y-3">
            {exposure.sensitive_windows.map((w, i) => (
              <div key={i} className="card">
                <p className="font-medium text-genarch-text">
                  {w.period} ({w.age_range})
                </p>
                <p className="text-sm text-genarch-subtext">{w.mechanism_rationale}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No sensitive windows data recorded.
          </p>
        )}
      </section>

      {/* GxE Highlights */}
      <section aria-labelledby="gxe-heading">
        <h2 id="gxe-heading" className="text-h2 text-genarch-text mb-3">
          GxE Highlights
        </h2>
        {exposure.gxe_highlights && exposure.gxe_highlights.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-sm overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Gene</th>
                  <th className="text-left px-4 py-2 font-medium">Disease</th>
                  <th className="text-left px-4 py-2 font-medium">Direction</th>
                  <th className="text-left px-4 py-2 font-medium">Evidence type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exposure.gxe_highlights.map((g, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/atlas/genes/${g.gene_slug}`}
                        className="text-genarch-link hover:underline"
                      >
                        {g.gene_slug}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/atlas/diseases/${g.disease_slug}`}
                        className="text-genarch-link hover:underline"
                      >
                        {g.disease_slug}
                      </Link>
                    </td>
                    <td className="px-4 py-2 capitalize">{g.direction}</td>
                    <td className="px-4 py-2">{g.evidence_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No GxE highlights recorded.
          </p>
        )}
      </section>

      {/* Tissue-Specific Notes */}
      <section aria-labelledby="tissues-heading">
        <h2 id="tissues-heading" className="text-h2 text-genarch-text mb-3">
          Tissue-Specific Notes
        </h2>
        {exposure.tissues && exposure.tissues.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {exposure.tissues.map((t, i) => (
              <div
                key={i}
                className="rounded-sm border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-genarch-text">{t.name}</span>
                {t.effect_type && (
                  <span className="text-genarch-subtext ml-1">— {t.effect_type}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-genarch-subtext italic">
            No tissue-specific notes recorded.
          </p>
        )}
      </section>

      {/* Evidence & Limitations */}
      <EvidenceLimitations>
        <p className="mb-2">
          Exposure definitions and proxies are based on curated literature.
          Population-level summaries are for educational use and do not imply
          individual risk or clinical recommendations.
        </p>
        <p className="mb-2">
          Sensitive windows and GxE highlights may reflect data availability
          biases. Transferability across populations and settings may vary.
        </p>
        <p>
          Data gaps are noted where evidence is limited or
          ancestry-representation is uneven.
        </p>
      </EvidenceLimitations>

      {/* Citations */}
      <CitationRenderer references={refs} />
    </article>
  );
}
