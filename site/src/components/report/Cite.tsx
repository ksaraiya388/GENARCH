import type { ReactNode } from "react";

import referencesDoc from "@/content/reports/2026/references.json";
import { separatorBreaks } from "./breaks";
import { tableLabel } from "./labels";

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
  /** Absent on an on-file entry: correspondence held by the author (D64). */
  url?: string;
  retrieved?: string;
  on_file?: boolean;
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

/**
 * The edition date of a lettered source, as its own reference entry records it.
 *
 * Prose that names "DEQ's 2026-10-09 edition" takes the date from here rather than
 * typing it, so the date in a sentence and the date in the Sources list are one
 * value. Throws on an id that is not a source, which fails the build.
 */
export function EditionDate({ id }: { id: string }) {
  const entry = SOURCES.find((source) => source.id === id);
  if (entry === undefined || !entry.edition_date) {
    throw new Error(
      `report source "${id}" has no edition_date in references.json, so EditionDate ` +
        "has nothing to render"
    );
  }
  return (
    <span className="report-edition-date" data-edition-of={id}>
      {entry.edition_date}
    </span>
  );
}

/**
 * A source note, with each `{table:T12}` token rendered as the table's printed label
 * and each `{cite:id}` token as that entry's citation label. Tables are numbered by
 * first appearance and references by list position, so a number typed into a note
 * would go stale when either moved (D47; audit round 2, M4).
 */
function noteText(note: string): ReactNode {
  const parts = note.split(/\{(table|cite):([A-Za-z0-9_]+)\}/);
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    out.push(parts[i]);
    if (i + 2 >= parts.length) break;
    const kind = parts[i + 1];
    const ref = parts[i + 2];
    out.push(
      kind === "table" ? (
        <span key={i} className="report-table-ref" data-table-ref={ref}>
          {tableLabel("2026", ref)}
        </span>
      ) : (
        <Cite key={i} id={ref} />
      )
    );
  }
  return out;
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
        Every entry carries a DOI, checked against Crossref on the date given: the title,
        first author and year of the record the DOI resolves to match the entry.
      </p>
      <ol className="report-references-list report-references-numbered">
        {LITERATURE.map((entry, i) => (
          <li key={entry.id} id={`reference-${entry.id}`}>
            <span className="report-reference-label">[{i + 1}]</span> {entry.authors} (
            {entry.year}). {entry.title}.
            {entry.journal ? <> <em>{entry.journal}</em>.</> : null}{" "}
            <a href={doiUrl(entry.doi)} className="report-doi">
              {separatorBreaks(doiUrl(entry.doi))}
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
            {entry.on_file || !entry.url ? (
              // Correspondence held by the author: named, dated and on file (D64).
              <>
                {entry.publisher}, {entry.title}, {entry.edition_date}, on file.
              </>
            ) : (
              <>
                {entry.publisher}. {entry.title}. {entry.edition_date}.{" "}
                <a href={entry.url} className="report-doi">
                  {separatorBreaks(entry.url)}
                </a>{" "}
                Retrieved {entry.retrieved}.
              </>
            )}
            {entry.note ? (
              <span className="report-references-note"> {noteText(entry.note)}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
