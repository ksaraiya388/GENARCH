import type { Reference } from "@/lib/types";

export interface CitationRendererProps {
  references: { id: string; title: string; authors: string; year: number; journal?: string; doi?: string; url?: string }[];
}

export function InlineCitation({ id }: { id: string }) {
  return (
    <sup>
      <a href={`#ref-${id}`} className="text-teal-primary no-underline hover:underline text-xs">
        [{id}]
      </a>
    </sup>
  );
}

export function CitationRenderer({ references }: CitationRendererProps) {
  if (!references || references.length === 0) return null;

  return (
    <section aria-labelledby="references-heading" className="mt-10">
      <h2 id="references-heading" className="text-h2 text-surface-white mb-4">
        References
      </h2>
      <ol className="space-y-3 text-sm">
        {references.map((ref, i) => (
          <li
            key={ref.id}
            id={`ref-${ref.id}`}
            className="text-cool-light leading-relaxed pl-6 relative"
          >
            <span className="absolute left-0 text-cool-mid font-mono text-xs">{i + 1}.</span>
            <span className="text-cool-mid">{ref.authors}</span>
            {" "}({ref.year}).{" "}
            <span className="text-surface-white">{ref.title}.</span>
            {ref.journal && <span className="text-cool-mid italic"> {ref.journal}.</span>}
            {ref.doi && (
              <>
                {" "}
                <a
                  href={`https://doi.org/${ref.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-primary hover:text-teal-soft text-xs no-underline hover:underline"
                >
                  doi:{ref.doi}
                </a>
              </>
            )}
            {ref.url && !ref.doi && (
              <>
                {" "}
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-primary hover:text-teal-soft text-xs no-underline hover:underline"
                >
                  [link]
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
