import type { ReactNode } from "react";

/**
 * Structural primitives for the report body.
 *
 * They exist for three reasons the plain tags do not cover. The print stylesheet
 * needs a stable hook on every top-level section so each one can start on a fresh
 * page. Every section needs a heading its own `aria-labelledby` points at, which is
 * the pattern the rest of the site already uses. And a callout needs a class the
 * print rules can keep off a page boundary, because a limitation split across two
 * pages reads as two partial limitations.
 */

export interface SectionProps {
  /** Section number as the report prints it: "1", "5.2", "A". */
  number?: string;
  title: string;
  /** Slug for the anchor and the heading id. */
  id: string;
  children: ReactNode;
  /** `false` for an unnumbered front-matter section such as the summary. */
  pageBreak?: boolean;
}

/** A top-level report section. Starts a new page in print. */
export function Section({ number, title, id, children, pageBreak = true }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      id={id}
      className={pageBreak ? "report-section report-page-break" : "report-section"}
      data-report-section={number ?? id}
    >
      <h2 id={headingId} className="report-h2">
        {number ? <span className="report-section-number">{number}</span> : null}
        {number ? " " : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

export interface SubProps {
  number?: string;
  title: string;
  id: string;
  children: ReactNode;
}

/** A numbered subsection. Never forced onto a new page. */
export function Sub({ number, title, id, children }: SubProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} id={id} className="report-subsection">
      <h3 id={headingId} className="report-h3">
        {number ? <span className="report-section-number">{number}</span> : null}
        {number ? " " : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A paragraph of report prose. */
export function P({ children }: { children: ReactNode }) {
  return <p className="report-p">{children}</p>;
}

/** A lead paragraph, set slightly larger: the first paragraph of the summary. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="report-lead">{children}</p>;
}

/**
 * A set-apart block that must not break across a page.
 *
 * Used for the constraint statement, the limitation boxes and the post-freeze notes
 * -- the passages whose whole function is to qualify a nearby number, and which fail
 * at that job if a reader meets the number on one page and the qualification on the
 * next.
 */
export function Callout({
  title,
  children,
  id,
}: {
  title?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <aside className="callout report-callout" id={id}>
      {title ? <p className="report-callout-title">{title}</p> : null}
      {children}
    </aside>
  );
}

/** An ordered list of report prose items. */
export function OrderedList({ children }: { children: ReactNode }) {
  return <ol className="report-ol">{children}</ol>;
}

/** An unordered list of report prose items. */
export function List({ children }: { children: ReactNode }) {
  return <ul className="report-ul">{children}</ul>;
}

export function Item({ children }: { children: ReactNode }) {
  return <li className="report-li">{children}</li>;
}

/**
 * A term and its definition, for the glossary.
 *
 * A description list rather than a table: the glossary is pairs, not a grid, and a
 * `<dl>` reads correctly to a screen reader without a header row to anchor it.
 */
export function Glossary({ children }: { children: ReactNode }) {
  return <dl className="report-glossary">{children}</dl>;
}

export function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="report-glossary-entry">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}
