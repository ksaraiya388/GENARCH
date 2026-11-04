import referencesDoc from "@/content/reports/2026/references.json";

export interface LiteratureEntry {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string | null;
  doi: string;
  verification: {
    method: string;
    source: string;
    checked_at: string | null;
  };
}

export interface SourceEntry {
  id: string;
  publisher: string;
  title: string;
  edition_date: string;
  url: string;
  retrieved: string;
  note?: string;
}

const LITERATURE: LiteratureEntry[] = referencesDoc.references as LiteratureEntry[];
const SOURCES: SourceEntry[] = referencesDoc.sources as SourceEntry[];

const INDEX = new Map<string, { kind: "literature" | "source"; position: number }>();
LITERATURE.forEach((entry, i) => INDEX.set(entry.id, { kind: "literature", position: i + 1 }));
SOURCES.forEach((entry, i) => INDEX.set(entry.id, { kind: "source", position: i + 1 }));

export function citationIds(): string[] {
  return Array.from(INDEX.keys());
}

/**
 * An inline citation, numbered within its own set.
 *
 * Literature is numbered and sources are lettered, because they answer different
 * questions: a numbered reference is a paper a reader can look up by DOI, and a
 * lettered source is a document, regulation or dataset release a reader can fetch at
 * a stated URL on a stated date. Collapsing the two would imply a DOI for things
 * that have none.
 *
 * An unknown id throws, which fails `next build`. A citation that silently renders
 * nothing is worse than a broken build in a document whose central claim is that
 * every statement is traceable.
 */
export function Cite({ id }: { id: string }) {
  const found = INDEX.get(id);
  if (found === undefined) {
    throw new Error(
      `report citation "${id}" is not in site/src/content/reports/2026/references.json. ` +
        "Add it there, with a DOI for literature or all five required fields for a source."
    );
  }
  const marker =
    found.kind === "literature"
      ? String(found.position)
      : String.fromCharCode(64 + found.position);
  return (
    <a
      className="report-cite"
      href={`#reference-${id}`}
      data-cite-id={id}
      aria-label={`Reference ${marker}`}
    >
      [{marker}]
    </a>
  );
}

function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

/** Both reference sets, rendered as two labelled, separately numbered lists. */
export function References() {
  return (
    <section aria-labelledby="references-heading" className="report-references">
      <h2 id="references-heading">References</h2>

      <h3 id="references-literature-heading">Literature</h3>
      <p className="report-references-note">
        Every entry carries a DOI. The verification note records how that DOI was
        checked: against Crossref for the entries taken from the project bibliography,
        or against the published atlas record that carries it.
      </p>
      <ol className="report-references-list">
        {LITERATURE.map((entry) => (
          <li key={entry.id} id={`reference-${entry.id}`}>
            {entry.authors} ({entry.year}). {entry.title}.
            {entry.journal ? <> <em>{entry.journal}</em>.</> : null}{" "}
            <a href={doiUrl(entry.doi)} className="report-doi">
              {doiUrl(entry.doi)}
            </a>
            <span className="report-references-verification">
              {" "}
              Verified: {entry.verification.method}
              {entry.verification.checked_at ? `, ${entry.verification.checked_at}` : ""}.
            </span>
          </li>
        ))}
      </ol>

      <h3 id="references-sources-heading">Sources</h3>
      <p className="report-references-note">
        Agency documents, regulations and dataset releases. None of these carries a DOI,
        so each is given by publisher, title, edition or version date, a stable address
        and the date it was retrieved.
      </p>
      <ol className="report-references-list report-references-lettered">
        {SOURCES.map((entry) => (
          <li key={entry.id} id={`reference-${entry.id}`}>
            {entry.publisher}. {entry.title}. {entry.edition_date}.{" "}
            <a href={entry.url} className="report-doi">
              {entry.url}
            </a>{" "}
            Retrieved {entry.retrieved}.
            {entry.note ? <span className="report-references-note"> {entry.note}</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
