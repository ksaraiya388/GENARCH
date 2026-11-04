"use client";

import { useState } from "react";

export interface CiteBoxProps {
  apa: string;
  bibtex: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is denied in some contexts and over plain HTTP. The text is
      // on the page in a selectable block either way, so a failed copy is a missing
      // convenience rather than a missing capability, and silently leaving the label
      // unchanged says so.
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={copy} className="btn-secondary report-copy">
      {copied ? "Copied" : label}
      <span className="sr-only">{copied ? "" : ` ${label.toLowerCase()} to clipboard`}</span>
    </button>
  );
}

/**
 * The two citation forms, each copyable.
 *
 * The only client component on the report page. Everything else renders at build time
 * into static HTML, which is what makes the page identical in the browser and in the
 * PDF; a clipboard write needs the browser, and this is the one thing on the page that
 * does.
 */
export function CiteBox({ apa, bibtex }: CiteBoxProps) {
  return (
    <section aria-labelledby="cite-heading" className="report-citebox callout">
      <h2 id="cite-heading" className="report-h3">
        Cite this report
      </h2>

      <div className="report-citeblock">
        <p className="report-citeblock-label">APA</p>
        <p className="report-citeblock-text">{apa}</p>
        <CopyButton value={apa} label="Copy APA" />
      </div>

      <div className="report-citeblock">
        <p className="report-citeblock-label">BibTeX</p>
        <pre className="report-citeblock-text report-pre">
          <code>{bibtex}</code>
        </pre>
        <CopyButton value={bibtex} label="Copy BibTeX" />
      </div>
    </section>
  );
}
