import Link from "next/link";

export default function MethodsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">Methods</h1>
        <p className="mt-3 text-textSecondary">
          GENARCH methods describe source datasets, transformations, confidence scoring rules, and explicit
          limitations.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Sources</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>GWAS Catalog / curated summary statistics</li>
          <li>GTEx tissue expression and eQTL context</li>
          <li>Reactome / pathway references</li>
          <li>EPA AQS and CDC WONDER community indicators</li>
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Transformations</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>Normalized slug IDs and strict citation IDs.</li>
          <li>Curated variant-gene and gene-pathway annotation layer.</li>
          <li>Strength and confidence computation per documented additive rules.</li>
          <li>Deterministic JSON emission and schema validation.</li>
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Scoring rules</h2>
        <p className="text-sm text-textSecondary">
          Strength (0-1) combines GWAS significance tier, replication, functional validation, and ancestry
          representation adjustments. Confidence tiers are assigned from strength thresholds and evidence type
          diversity.
        </p>
        <p className="mt-2 text-sm">
          Full scoring details: <Link href="/methods/model-card">model card</Link> and repository METHODS.md.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Ethics and model cards</h2>
        <p className="text-sm text-textSecondary">
          GENARCH is educational-only, does not compute personal risk, and does not store user identity data.
        </p>
        <div className="mt-2 space-x-4 text-sm">
          <Link href="/methods/ethics">Ethics</Link>
          <Link href="/methods/model-card">Model card</Link>
        </div>
      </section>
    </div>
  );
}
