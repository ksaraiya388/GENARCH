import { reportTable, reportTableRows } from "@/lib/report-registry";
import { isNumericCell, tableLabel } from "./labels";
import { TABLE_RENDER, checkRender, formatCell, softHyphenate } from "./table-render";

export interface ReportTableProps {
  year: string;
  /** Short id (T03) or full id (T03_collocation); both resolve. */
  id: string;
  /**
   * Columns whose cells are hashes, truncated to a readable prefix. Appendix A
   * carries them in full, so the table stays legible at Letter width without the
   * provenance going missing.
   */
  hashColumns?: string[];
  /** Suppress the caption text, for a table rendered inside a figure's details. */
  compact?: boolean;
}

const HASH_PREFIX = 12;

/**
 * One report table, rendered from its CSV as an accessible table.
 *
 * The rows are never retyped: the manifest names a CSV, the CSV is the published
 * artifact CI byte-compares, and this reads it. `reportTableRows` also checks the
 * row count against the manifest, so a table and its manifest cannot drift apart
 * without the build saying so.
 *
 * Accessibility, which matters here because several of these tables are the data
 * fallback for a figure: a real `<caption>`, `scope="col"` on every header cell,
 * `scope="row"` on the first cell of each body row, the unit in the header rather
 * than repeated down the column, and the source note in a `<figcaption>` below
 * rather than inside the caption where it would be read as part of the title.
 */
export function ReportTable({ year, id, hashColumns = [], compact = false }: ReportTableProps) {
  const manifest = reportTable(year, id);
  const { header, rows } = reportTableRows(year, manifest);
  const label = tableLabel(manifest.id);

  // The manifest's `units` map is keyed by column name, but not every entry names a
  // column: T03 records units for "Intercept and slope" and "n", which are concepts
  // in the table rather than headers of it. Entries that match a column become part
  // of that header; the rest are reported below so nothing is dropped.
  // Two width tiers. A table of eight or more columns is set smaller and allowed to
  // wrap its headings; one of thirteen or more is narrow enough per column that its
  // first column has to wrap too, and its caption has to be pinned to the page
  // measure rather than following a table that is wider than the page.
  const wide = header.length >= 8;
  const extraWide = header.length >= 13;

  //
  // On the widest tables the units come out of the headers entirely. Twelve of the
  // fifteen columns of the loci table carry the same unit, and appending it to each
  // adds eight characters to twelve minimum column widths; in a 6.5in print measure
  // the table pays for that at its right edge, and the last column's heading was
  // rendering as a few letters per line. They are stated under the table instead,
  // which is where an unmatched unit already goes.
  const render = TABLE_RENDER[manifest.id] ?? {};
  checkRender(manifest.id, header, render);
  const unitsInHeader = !extraWide && !render.unitsBelow;
  const unitFor = (column: string): string | null => {
    if (!unitsInHeader) return null;
    const unit = manifest.units[column];
    if (!unit) return null;
    // Several headers already carry their unit in parentheses. Repeating it would
    // read as two different units on one column.
    if (column.includes(unit)) return null;
    return unit;
  };
  const unmatchedUnits = Object.entries(manifest.units).filter(
    ([column]) => !unitsInHeader || !header.includes(column)
  );

  const hashCols = new Set(
    hashColumns.filter((column) => header.includes(column)).map((column) => header.indexOf(column))
  );
  // Columns sharing a unit are listed together, so a table whose twelve count columns
  // moved out of the headers reads as one clause rather than twelve.
  const groupedUnits = Array.from(
    unmatchedUnits.reduce((acc, [column, unit]) => {
      const columns = acc.get(unit) ?? [];
      columns.push(column);
      acc.set(unit, columns);
      return acc;
    }, new Map<string, string[]>())
  );

  const colIndex = (columns: string[] | undefined) =>
    new Set((columns ?? []).map((column) => header.indexOf(column)));
  const monoCols = colIndex(render.mono);
  const breakCols = colIndex(render.breakAnywhere);
  const formatAt = new Map(
    Object.entries(render.format ?? {}).map(([column, f]) => [header.indexOf(column), f])
  );
  const emptyAt = new Map(
    Object.entries(render.emptyAs ?? {}).map(([column, text]) => [header.indexOf(column), text])
  );
  const labelCol = render.shortLabels ? header.indexOf(render.shortLabels.column) : -1;
  // Each long sentence the short labels stand for, in order of first appearance, so
  // the note prints each one once.
  const labelled = new Map<string, string>();

  let truncated = false;

  const renderCell = (value: string, column: number): string => {
    if (hashCols.has(column) && value.length > HASH_PREFIX) {
      truncated = true;
      return `${value.slice(0, HASH_PREFIX)}…`;
    }
    if (column === labelCol && render.shortLabels) {
      const short = render.shortLabels.labels[value];
      if (!short) {
        throw new Error(
          `table ${manifest.id}: no short label for ${render.shortLabels.column} "${value}"`
        );
      }
      if (!labelled.has(short)) labelled.set(short, value);
      return short;
    }
    if (value.trim() === "" && emptyAt.has(column)) return emptyAt.get(column)!;
    const format = formatAt.get(column);
    return format ? formatCell(value, format) : value;
  };

  const cellClass = (cell: string, c: number): string | undefined =>
    [
      isNumericCell(cell) ? "report-table-num" : "",
      monoCols.has(c) ? "report-cell-mono" : "",
      breakCols.has(c) ? "report-cell-break" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const body = rows.map((row, r) => (
    <tr key={r}>
      {row.map((cell, c) =>
        c === 0 ? (
          <th key={c} scope="row" className="report-table-rowhead">
            {renderCell(cell, c)}
          </th>
        ) : (
          <td key={c} className={cellClass(cell, c)}>
            {renderCell(cell, c)}
          </td>
        )
      )}
    </tr>
  ));

  const notes = [
    ...(labelCol >= 0 && render.shortLabels
      ? [
          `${render.shortLabels.column}: ` +
            Array.from(labelled.entries())
              .map(([short, sentence]) => `${short}: ${sentence}`)
              .join(" "),
        ]
      : []),
    ...(render.notes ?? []),
  ];
  const fixed = render.widths !== undefined;

  return (
    <figure
      className={
        [
          "report-table-figure",
          wide ? "report-table-wide" : "",
          extraWide ? "report-table-xwide" : "",
          fixed ? "report-table-fixed" : "",
          render.small ? "report-table-small" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      id={`table-${manifest.id}`}
      data-table-id={manifest.id}
      data-table-columns={header.length}
    >
      <table className="report-table">
        <caption className="report-table-caption">
          <span className="report-table-label">{label}.</span>{" "}
          <span className="report-table-title">{manifest.title}</span>
          {!compact && <span className="report-table-text"> {manifest.caption}</span>}
        </caption>
        {fixed && (
          <colgroup>
            {header.map((column) => (
              <col
                key={column}
                style={{ ["--col-w" as string]: render.widths![column] }}
              />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {header.map((column, c) => {
              const unit = unitFor(column);
              return (
                <th key={c} scope="col">
                  {fixed ? softHyphenate(column) : column}
                  {unit && <span className="report-table-unit"> ({unit})</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
      <figcaption className="report-table-source">
        <span className="report-source-label">Source:</span> {manifest.source_note}
        {render.unitsNote ? (
          <>
            {" "}
            <span className="report-source-label">Units:</span> {render.unitsNote}.
          </>
        ) : (
          unmatchedUnits.length > 0 && (
            <>
              {" "}
              <span className="report-source-label">Units:</span>{" "}
              {groupedUnits.map(([unit, columns], i) => (
                <span key={unit}>
                  {i > 0 && "; "}
                  {columns.join(", ")} in {unit}
                </span>
              ))}
              .
            </>
          )
        )}
        {truncated && (
          <>
            {" "}
            Hashes are shown to their first {HASH_PREFIX} characters; Appendix A
            carries them in full.
          </>
        )}
        {notes.map((note) => (
          <span key={note} className="report-table-note">
            <span className="report-source-label">Note:</span> {note}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
