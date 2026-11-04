import { figureSrc, reportFigure } from "@/lib/report-registry";
import { FigureLimitation } from "./DeqLimitation";
import { ReportTable } from "./ReportTable";
import { figureLabel } from "./labels";

export interface ReportFigureProps {
  year: string;
  /** Short id (F02) or full id (F02_collocation); both resolve. */
  id: string;
  /**
   * Table to render as the data fallback, when the figure's own `data_table` is too
   * long for the body. F03 is the case: it plots the 119-row daily reconciliation,
   * whose summary belongs under the figure and whose full form belongs in Appendix B.
   */
  tableId?: string;
  hashColumns?: string[];
}

/**
 * One report figure: the image, its caption, its limitation, and its data table.
 *
 * The image is a static SVG the pipeline rendered at the freeze, served from
 * `public/reports/<year>/` where `copy-data.js` stages it. There is no chart library
 * on this page: a figure in a citable report has to be the same picture every time
 * it is opened and the same picture the PDF carries, which a client-rendered chart
 * is not.
 *
 * Every data-bearing figure carries a `<details>` data table, so the numbers behind
 * it are reachable without reading the image (docs/CONTENT_CONSTRAINTS.md, and the
 * fallback rule the charts audit added). The alt text is the generator's, written
 * against neutral site codes.
 */
export function ReportFigure({ year, id, tableId, hashColumns }: ReportFigureProps) {
  const manifest = reportFigure(year, id);
  const label = figureLabel(manifest.id);
  const dataTable = tableId ?? manifest.data_table;

  return (
    <figure
      className="report-figure"
      id={`figure-${manifest.id}`}
      data-figure-id={manifest.id}
    >
      {/* Static export: next/image is off (images.unoptimized) and the SVG is a
          fixed-size artifact, so a plain img is what serves and what prints. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="report-figure-image"
        src={figureSrc(year, manifest.id)}
        alt={manifest.alt_text}
      />
      <figcaption className="report-figure-caption">
        <p>
          <span className="report-figure-label">{label}.</span>{" "}
          <span className="report-figure-title">{manifest.title}</span>{" "}
          <span className="report-figure-text">{manifest.caption}</span>
        </p>
        <FigureLimitation text={manifest.limitation} />
      </figcaption>
      <details className="report-figure-details">
        <summary>Data table</summary>
        <ReportTable year={year} id={dataTable} hashColumns={hashColumns} compact />
      </details>
    </figure>
  );
}
