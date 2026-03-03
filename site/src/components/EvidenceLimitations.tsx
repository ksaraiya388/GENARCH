import { ReactNode } from "react";

export interface EvidenceLimitationsProps {
  children: ReactNode;
}

export function EvidenceLimitations({ children }: EvidenceLimitationsProps) {
  return (
    <aside
      className="evidence-box"
      aria-labelledby="evidence-limitations-heading"
    >
      <h3
        id="evidence-limitations-heading"
        className="mb-3 font-sans text-sm font-semibold text-teal-primary"
      >
        Evidence & Limitations
      </h3>
      <div className="text-sm text-cool-light leading-relaxed">
        {children}
      </div>
    </aside>
  );
}
