import type { ReactNode } from "react";

export interface DeqFigureTable {
  columns: string[];
  rows: (string | number)[][];
  /** Describes the table for screen readers; also the <details> summary. */
  caption: string;
}

export interface DeqFigureProps {
  id: string;
  heading: string;
  /** Read to screen readers in place of the chart graphics. */
  ariaLabel: string;
  /** Rendered as the <figcaption>: what the figure shows, and where the numbers came from. */
  caption: ReactNode;
  table: DeqFigureTable;
  children: ReactNode;
}

/**
 * Wrapper every figure on the data-center-alley page renders inside.
 *
 * Three things are guaranteed here rather than left to each chart: a text alternative that
 * carries the same information as the graphic, a caption naming the source, and a complete data
 * table. The table is not a courtesy — the series palette carries a documented contrast warning
 * on one slot, and the table is the relief channel that makes that warning legal.
 *
 * The chart itself scrolls inside this container on a narrow viewport; the page body never does.
 */
export function DeqFigure({
  id, heading, ariaLabel, caption, table, children,
}: DeqFigureProps) {
  return (
    <figure
      id={id}
      className="rounded-lg border border-white/[0.08] bg-navy-mid/50 p-4 sm:p-5"
      aria-labelledby={`${id}-heading`}
    >
      <h3 id={`${id}-heading`} className="text-h3 text-surface-white mb-3">
        {heading}
      </h3>

      <div className="w-full overflow-x-auto" role="img" aria-label={ariaLabel}>
        {children}
      </div>

      <figcaption className="mt-3 text-xs leading-relaxed text-cool-light">
        {caption}
      </figcaption>

      <details className="mt-3 border-t border-white/[0.06] pt-3">
        <summary className="cursor-pointer text-xs text-teal-primary hover:text-teal-soft">
          {table.caption}
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <caption className="sr-only">{table.caption}</caption>
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                {table.columns.map((c) => (
                  <th key={c} scope="col" className="whitespace-nowrap py-2 pr-4 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`whitespace-nowrap py-1.5 pr-4 ${
                        j === 0 ? "text-surface-white" : "font-mono text-cool-light"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
