import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getMechanismBrief,
  getAllMechanismBriefs,
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
  const briefs = getAllMechanismBriefs();
  return briefs.map((b) => ({ slug: b.slug }));
}

export default async function MechanismBriefDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brief = getMechanismBrief(slug);
  if (!brief) notFound();

  const refs = ensureRefAuthors(brief.references ?? []);

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: "Mechanism Briefs", href: "/mechanism-briefs/" },
          { label: brief.title },
        ]}
      />

      {/* Title (declarative, hypothesis-driven) */}
      <header>
        <h1 className="text-h1 text-genarch-text">{brief.title}</h1>
      </header>

      {/* Central Question */}
      <section aria-labelledby="central-question-heading">
        <h2 id="central-question-heading" className="text-h2 text-genarch-text mb-3">
          Central Question
        </h2>
        <p className="text-genarch-text">{brief.question}</p>
      </section>

      {/* Background (150–200 words) */}
      <section aria-labelledby="background-heading">
        <h2 id="background-heading" className="text-h2 text-genarch-text mb-3">
          Background
        </h2>
        <div className="prose prose-sm max-w-none text-genarch-text">
          <p>{brief.background}</p>
        </div>
      </section>

      {/* Evidence Summary (bulleted) */}
      <section aria-labelledby="evidence-summary-heading">
        <h2 id="evidence-summary-heading" className="text-h2 text-genarch-text mb-3">
          Evidence Summary
        </h2>
        <ul className="list-disc list-inside space-y-2 text-genarch-text">
          {(brief.evidence_summary ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Mechanistic Chain (numbered steps) */}
      <section aria-labelledby="mechanistic-chain-heading">
        <h2 id="mechanistic-chain-heading" className="text-h2 text-genarch-text mb-3">
          Mechanistic Chain
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-genarch-text">
          {(brief.mechanistic_chain ?? []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      {/* Tissue Specificity */}
      <section aria-labelledby="tissue-specificity-heading">
        <h2 id="tissue-specificity-heading" className="text-h2 text-genarch-text mb-3">
          Tissue Specificity
        </h2>
        <p className="text-genarch-text">{brief.tissue_specificity}</p>
      </section>

      {/* Counterarguments / Limitations (at least 2) */}
      <section aria-labelledby="counterarguments-heading">
        <h2 id="counterarguments-heading" className="text-h2 text-genarch-text mb-3">
          Counterarguments / Limitations
        </h2>
        <ul className="list-disc list-inside space-y-2 text-genarch-text">
          {(brief.counterarguments ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* Validation Criteria */}
      <section aria-labelledby="validation-criteria-heading">
        <h2 id="validation-criteria-heading" className="text-h2 text-genarch-text mb-3">
          Validation Criteria
        </h2>
        <ul className="list-disc list-inside space-y-2 text-genarch-text">
          {(brief.validation_criteria ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      {/* References */}
      <CitationRenderer references={refs} />

      {/* Evidence & Limitations box */}
      <EvidenceLimitations>
        <p className="mb-2">
          This mechanism brief presents a hypothesis-driven synthesis of
          population-level evidence. Findings do not imply individual risk or
          clinical guidance.
        </p>
        <p className="mb-2">
          Mechanistic chains are proposed models subject to ongoing validation.
          Confidence and evidence strength reflect current literature, not
          certainty.
        </p>
        <p>
          Related entities (diseases, exposures, genes, pathways) link to full
          atlas entries for further context.
        </p>
      </EvidenceLimitations>
    </article>
  );
}
