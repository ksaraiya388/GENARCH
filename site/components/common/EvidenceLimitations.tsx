interface EvidenceLimitationsProps {
  bullets?: string[];
}

const defaultBullets = [
  "Evidence is aggregated from public datasets and curated literature.",
  "Signals reflect population-level associations, not individual predictions.",
  "Ancestry representation is uneven in many GWAS datasets and can limit transferability.",
  "Mechanistic links may include inferred steps pending stronger experimental validation."
];

export function EvidenceLimitations({
  bullets = defaultBullets
}: EvidenceLimitationsProps): JSX.Element {
  return (
    <aside
      className="content-card border-l-4 border-l-atlas bg-red-50/30"
      aria-label="Evidence and limitations"
    >
      <h2 className="section-title">Evidence &amp; Limitations</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-textSecondary">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </aside>
  );
}
