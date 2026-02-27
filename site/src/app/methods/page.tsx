import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function MethodsPage() {
  return (
    <article className="space-y-10">
      <Breadcrumbs items={[{ label: "Methods" }]} />

      <header>
        <h1 className="text-h1 text-genarch-text">Methods</h1>
        <p className="mt-2 text-genarch-subtext max-w-2xl">
          Data sources, transformations, scoring rules, pipeline architecture,
          and limitations for the GENARCH atlas.
        </p>
      </header>

      <section aria-labelledby="data-sources-heading">
        <h2 id="data-sources-heading" className="text-h2 text-genarch-text mb-3">
          Data Sources
        </h2>
        <ul className="list-disc list-inside space-y-2 text-genarch-text">
          <li>GWAS Catalog — variant-disease associations</li>
          <li>GTEx — tissue-specific eQTL and expression</li>
          <li>Literature curation — exposure modifiers, mechanism hypotheses</li>
          <li>EPA, NLCD — environmental exposure proxies</li>
          <li>State/BRFSS — health burden estimates</li>
        </ul>
      </section>

      <section aria-labelledby="transformations-heading">
        <h2 id="transformations-heading" className="text-h2 text-genarch-text mb-3">
          Transformations
        </h2>
        <p className="text-genarch-text">
          Raw data are harmonized to common ontologies (ICD-11, exposure
          taxonomies). Gene symbols and pathway mappings are standardized. Evidence
          is scored using predefined rules (see below).
        </p>
      </section>

      <section aria-labelledby="scoring-heading">
        <h2 id="scoring-heading" className="text-h2 text-genarch-text mb-3">
          Scoring Rules
        </h2>
        <p className="text-genarch-text mb-4">
          Confidence tiers (low / medium / high) reflect evidence strength:
        </p>
        <ul className="list-disc list-inside space-y-2 text-genarch-text">
          <li>High: replicated findings, multiple evidence types, multi-ancestry</li>
          <li>Medium: consistent single-ancestry or limited replication</li>
          <li>Low: suggestive associations, limited validation</li>
        </ul>
      </section>

      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="text-h2 text-genarch-text mb-3">
          Pipeline Architecture
        </h2>
        <p className="text-genarch-text mb-4">
          The GENARCH pipeline ingests curated data, applies scoring rules, and
          produces structured JSON outputs for the web atlas. Pipeline runs are
          versioned and documented in the updates section.
        </p>
        <div className="card bg-genarch-bg/50">
          <p className="text-sm text-genarch-subtext">
            Pipeline code and configuration are available in the project
            repository.
          </p>
        </div>
      </section>

      <section aria-labelledby="limitations-heading">
        <h2 id="limitations-heading" className="text-h2 text-genarch-text mb-3">
          Limitations
        </h2>
        <ul className="list-disc list-inside space-y-2 text-genarch-text">
          <li>GWAS and eQTL data remain predominantly European-ancestry</li>
          <li>Exposure proxies may not capture true biological exposure</li>
          <li>Mechanism briefs are hypothesis-driven, not validated causal models</li>
          <li>Community models have geographic and temporal limitations</li>
        </ul>
      </section>

      <nav aria-label="Methods subpages" className="flex gap-4 pt-6">
        <Link href="/methods/ethics/" className="btn-secondary no-underline">
          Ethics Framework
        </Link>
        <Link href="/community/" className="btn-secondary no-underline">
          Model Card (via Community)
        </Link>
      </nav>
    </article>
  );
}
