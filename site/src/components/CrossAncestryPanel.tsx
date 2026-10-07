import Link from "next/link";
import type { CrossAncestrySection, Reference } from "@/lib/types";
import { CitationRenderer, InlineCitation } from "./CitationRenderer";
import { ConfidenceBadge, type ConfidenceTier } from "./ConfidenceBadge";

export interface CrossAncestryPanelProps {
  section: CrossAncestrySection;
  /**
   * Heading level. The disease page already has an h1 and sibling h2s, so the
   * panel renders an h2 there. The landing page nests it under its own h2.
   */
  as?: "h2" | "h3";
  /**
   * Render this module's own reference list. Pass false when the host page already
   * renders a CitationRenderer: that component emits a fixed `id="references-heading"`
   * and `id="ref-<id>"` anchors, so two of them on one page would duplicate element
   * IDs and break the inline citation links. The disease page passes false and merges
   * these references into its single list instead.
   */
  renderReferences?: boolean;
}

function toTier(c: string): ConfidenceTier {
  const u = c.toUpperCase();
  return u === "HIGH" || u === "MEDIUM" ? u : "LOW";
}

function ensureRefAuthors(refs: Reference[]) {
  return refs.map((r) => ({ ...r, authors: r.authors ?? "Unknown" }));
}

function Cites({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => (
        <InlineCitation key={id} id={id} />
      ))}
    </>
  );
}

/**
 * Cross-ancestry transferability panel.
 *
 * Renders published, group-level transferability metrics. It contains no input, no
 * computation and no score: every number on it was measured in a cited study on a
 * study population, and nothing here can be evaluated for a person.
 *
 * A metric name is printed next to every value, in the same cell, because the values
 * in this table are NOT on a common scale across rows when the rows cite different
 * studies. Showing a bare number in a column headed "transferability" would invite
 * exactly the cross-study comparison the evidence does not support.
 */
export function CrossAncestryPanel({
  section,
  as = "h2",
  renderReferences = true,
}: CrossAncestryPanelProps) {
  const Heading = as;
  const subHeading = as === "h2" ? "h3" : "h4";
  const SubHeading = subHeading;
  const headingClass = as === "h2" ? "text-h2" : "text-h3";

  return (
    <section aria-labelledby="cross-ancestry-heading" id="cross-ancestry">
      <Heading
        id="cross-ancestry-heading"
        className={`${headingClass} text-surface-white mb-3`}
      >
        Cross-ancestry transferability
      </Heading>

      <div className="prose prose-sm max-w-none text-cool-light">
        <p>{section.summary}</p>
      </div>

      <div className="mt-4 rounded-sm border border-white/[0.06] bg-navy-mid p-4">
        <SubHeading className="text-sm font-semibold text-surface-white mb-2">
          Loudoun County context
        </SubHeading>
        <p className="text-sm text-cool-light">{section.loudoun_context.text}</p>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
          <caption className="sr-only">
            Reported cross-ancestry transferability by population group, with the
            metric named for every value.
          </caption>
          <thead className="bg-white/[0.03]">
            <tr>
              <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                Population
              </th>
              <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                GWAS representation
              </th>
              <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                Reported transferability metric
              </th>
              <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                Per-variant effect-estimate notes
              </th>
              <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                Evidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {section.groups.map((g) => (
              <tr key={g.population} className="align-top hover:bg-white/[0.04]">
                <th scope="row" className="text-left px-4 py-3 font-medium text-surface-white">
                  {g.population}
                  <span className="block mt-1 text-xs font-normal text-cool-mid">
                    Study labels: {g.labels_as_used}
                  </span>
                </th>
                <td className="px-4 py-3 text-cool-light">
                  {g.gwas_representation.text}
                  <Cites ids={g.gwas_representation.citations} />
                </td>
                <td className="px-4 py-3 text-cool-light">
                  {g.prs_transferability.value !== null ? (
                    <span className="block text-surface-white font-medium">
                      {g.prs_transferability.metric}:{" "}
                      {g.prs_transferability.value}
                    </span>
                  ) : (
                    <span className="block text-cool-mid italic">
                      Not quantified in the verified sources
                    </span>
                  )}
                  <span className="block mt-1 text-xs text-cool-mid">
                    Compared with: {g.prs_transferability.comparator}
                  </span>
                  <span className="block text-xs text-cool-mid">
                    Study: {g.prs_transferability.study}
                  </span>
                  <span className="block mt-2">
                    {g.prs_transferability.text}
                    <Cites ids={g.prs_transferability.citations} />
                  </span>
                </td>
                <td className="px-4 py-3 text-cool-light">
                  {g.effect_estimate_notes.text}
                  <Cites ids={g.effect_estimate_notes.citations} />
                </td>
                <td className="px-4 py-3">
                  <ConfidenceBadge tier={toTier(g.evidence_confidence)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <SubHeading className="text-sm font-semibold text-surface-white mb-2">
            What the verified sources do not measure
          </SubHeading>
          <ul className="space-y-2 text-sm text-cool-light">
            {section.groups.map((g) => (
              <li key={g.population}>
                <span className="text-cool-mid">{g.population}:</span>{" "}
                {g.not_quantified.length > 0 ? (
                  <span>{g.not_quantified.join("; ")}.</span>
                ) : (
                  <span className="italic text-cool-mid">
                    No outstanding gap recorded for this group.
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SubHeading className="text-sm font-semibold text-surface-white mb-2">
            Why accuracy differs across ancestry groups
          </SubHeading>
          <p className="text-sm text-cool-light">
            {section.mechanisms_of_degradation.text}
            <Cites ids={section.mechanisms_of_degradation.citations} />
          </p>
        </div>

        <div>
          <SubHeading className="text-sm font-semibold text-surface-white mb-2">
            Data gaps
          </SubHeading>
          <p className="text-sm text-cool-light">{section.data_gaps}</p>
        </div>

        <div>
          <SubHeading className="text-sm font-semibold text-surface-white mb-2">
            Limitations
          </SubHeading>
          <p className="text-sm text-cool-light">{section.limitations}</p>
        </div>

        <p className="text-sm">
          <Link
            href="/ancestry-equity"
            className="text-teal-primary hover:text-teal-soft hover:underline"
          >
            All cross-ancestry modules, Loudoun population context, and methods →
          </Link>
        </p>
        <p className="text-xs text-cool-mid">
          Last updated {section.last_updated}.
        </p>
      </div>

      {renderReferences && (
        <CitationRenderer references={ensureRefAuthors(section.references)} />
      )}
    </section>
  );
}
