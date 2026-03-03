export default function ModelCardPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">Hotspot Model Card</h1>
        <p className="mt-3 text-textSecondary">
          The GENARCH community model estimates relative modeled burden using public aggregate indicators.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Intended use</h2>
        <p className="text-sm text-textSecondary">
          Educational interpretation of regional burden drivers and explanatory SHAP factors.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Not intended use</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>Diagnosis, triage, or clinical risk classification.</li>
          <li>Individual-level health inference.</li>
          <li>Policy-grade causal attribution without additional study design safeguards.</li>
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Features and data</h2>
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>PM2.5 annual mean, industrial proximity, food access, social vulnerability index.</li>
          <li>Public sources only (EPA AQS, EJSCREEN, USDA, CDC WONDER, ACS).</li>
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Performance metrics</h2>
        <p className="text-sm text-textSecondary">
          Placeholder seed metrics: R² = 0.68, MAE = 0.09. Metrics are illustrative for v1 seed data and must
          be re-estimated as coverage expands.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Known limitations</h2>
        <p className="text-sm text-textSecondary">
          Aggregated data can hide intra-region heterogeneity. Exposure metrics are proxies, not personal
          measurements. Model outputs are relative and uncertainty-aware.
        </p>
      </section>
    </div>
  );
}
