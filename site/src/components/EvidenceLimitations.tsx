import { ReactNode } from "react";

export interface EvidenceLimitationsProps {
  children: ReactNode;
}

export function EvidenceLimitations({ children }: EvidenceLimitationsProps) {
  return (
    <aside
      className="my-6 rounded-r-sm border-l-4 border-amber-400 bg-amber-50/70 p-5"
      aria-labelledby="evidence-limitations-heading"
    >
      <h3
        id="evidence-limitations-heading"
        className="mb-3 font-sans text-sm font-semibold text-amber-900"
      >
        Evidence & Limitations
      </h3>
      <div className="text-sm text-amber-900/90 prose prose-sm max-w-none">
        {children}
      </div>
    </aside>
  );
}
