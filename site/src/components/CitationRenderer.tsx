import Link from "next/link";

export interface Reference {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
}

export interface CitationRendererProps {
  references: Reference[];
}

export interface InlineCitationProps {
  id: string;
  references: Reference[];
}

function formatAuthorsAPA(authors: string): string {
  const names = authors.split(/,\s*|\s+and\s+/i).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length <= 7)
    return names.join(", ").replace(/, ([^,]*)$/, ", & $1");
  return `${names.slice(0, 6).join(", ")}, et al.`;
}

function formatReferenceAPA(ref: Reference): string {
  const authors = formatAuthorsAPA(ref.authors);
  const base = `${authors} (${ref.year}). ${ref.title}.`;
  return ref.journal ? `${base} ${ref.journal}.` : `${base}`;
}

export function CitationRenderer({ references }: CitationRendererProps) {
  if (references.length === 0) return null;

  return (
    <section
      className="mt-12 border-t border-gray-200 pt-8"
      aria-labelledby="references-heading"
    >
      <h2
        id="references-heading"
        className="mb-4 font-sans text-lg font-semibold text-genarch-text"
      >
        References
      </h2>
      <ol
        className="list-decimal space-y-4 pl-5"
        style={{ listStylePosition: "outside" }}
      >
        {references.map((ref) => (
          <li
            key={ref.id}
            id={`ref-${ref.id}`}
            className="text-sm text-genarch-text leading-relaxed"
          >
            <span className="font-medium">
              {formatReferenceAPA(ref)}
            </span>
            {(ref.doi || ref.url) && (
              <span className="ml-1">
                {ref.doi && (
                  <>
                    {" "}
                    <Link
                      href={`https://doi.org/${ref.doi.replace(/^https?:\/\/doi\.org\//i, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-genarch-link hover:underline"
                    >
                      https://doi.org/{ref.doi.replace(/^https?:\/\/doi\.org\//i, "")}
                    </Link>
                  </>
                )}
                {ref.url && !ref.doi && (
                  <>
                    {" "}
                    <Link
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-genarch-link hover:underline"
                    >
                      {ref.url}
                    </Link>
                  </>
                )}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InlineCitation({ id, references }: InlineCitationProps) {
  const ref = references.find((r) => r.id === id);
  const index = ref ? references.indexOf(ref) + 1 : null;

  if (index === null) return null;

  return (
    <sup
      className="ml-0.5 align-baseline"
      aria-label={`Citation ${index}`}
    >
      <a
        href={`#ref-${id}`}
        className="text-genarch-link hover:underline focus:outline-none focus:ring-2 focus:ring-genarch-primary focus:ring-offset-1 rounded"
      >
        [<span aria-hidden="true">{index}</span>]
      </a>
    </sup>
  );
}
