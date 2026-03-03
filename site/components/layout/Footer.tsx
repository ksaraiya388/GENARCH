export function Footer(): JSX.Element {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-textSecondary">
        <p>GENARCH v1.0 • Last pipeline run: 2026-02-26 • License: CC BY-NC-SA 4.0</p>
        <p className="mt-2">
          Educational only; not medical advice. GENARCH does not provide individual risk scores,
          diagnosis, or treatment recommendations.
        </p>
      </div>
    </footer>
  );
}
