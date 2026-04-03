interface EvidenceBoxProps {
  evidenceTypes?: string[];
  limitations?: string[];
  caveats?: string[];
}

export function EvidenceBox({ evidenceTypes, limitations, caveats }: EvidenceBoxProps) {
  const hasContent =
    (evidenceTypes && evidenceTypes.length > 0) ||
    (limitations && limitations.length > 0) ||
    (caveats && caveats.length > 0);

  if (!hasContent) return null;

  return (
    <div className="border border-white/[0.08] rounded-md p-5 bg-navy-mid/50 space-y-4">
      <h3 className="text-h3 text-surface-white flex items-center gap-2">
        <svg className="w-5 h-5 text-cool-mid" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        Evidence &amp; Limitations
      </h3>

      {evidenceTypes && evidenceTypes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-surface-white mb-1">Evidence Types</h4>
          <ul className="list-disc list-inside space-y-0.5 text-sm text-cool-light">
            {evidenceTypes.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {limitations && limitations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-surface-white mb-1">Limitations</h4>
          <ul className="list-disc list-inside space-y-0.5 text-sm text-cool-light">
            {limitations.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      )}

      {caveats && caveats.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-surface-white mb-1">Caveats</h4>
          <ul className="list-disc list-inside space-y-0.5 text-sm text-cool-light">
            {caveats.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <p className="text-xs text-cool-dark border-t border-white/[0.06] pt-3">
        Educational only. Not medical advice. Not a diagnostic tool.
      </p>
    </div>
  );
}

export type { EvidenceBoxProps };
