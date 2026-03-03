export default function EthicsPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">ETHICS</h1>
        <p className="mt-3 text-textSecondary">
          GENARCH is intentionally designed as an educational atlas. It is not a clinical decision system.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Hard constraints</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
          <li>No accounts, no login flows, no user profile storage.</li>
          <li>No personal genotype upload or individualized risk scoring.</li>
          <li>No diagnosis language, treatment recommendations, or screening directives.</li>
          <li>Passport generation is stateless and non-identifying.</li>
        </ul>
      </section>

      <section className="content-card">
        <h2 className="section-title">Population equity framing</h2>
        <p className="text-sm text-textSecondary">
          GENARCH surfaces ancestry representation limitations and avoids deterministic interpretation when
          evidence is ancestry-skewed or sparse.
        </p>
      </section>

      <section className="content-card">
        <h2 className="section-title">Environmental justice framing</h2>
        <p className="text-sm text-textSecondary">
          Community pages use neutral language (“higher modeled burden”) and only public aggregate indicators
          to avoid stigmatizing individuals or neighborhoods.
        </p>
      </section>
    </div>
  );
}
