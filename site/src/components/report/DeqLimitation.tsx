import deqLimitation from "@/content/deq-limitation.json";

/**
 * The single source for the four parts, read from the generated JSON.
 *
 * `scripts/gen_deq_limitation.py` slices `limitation` out of `DEQ_REPORT_LIMITATION`
 * in `site/src/content/deq-attribution.ts`, which is DEQ's published weekly-report
 * wording transcribed from the PDF, and takes the pairing sentence and credit line
 * out of `docs/report-2026/CONTEXT.md` section 3. The pipeline
 * (`pipeline/report_lib/figures.py`) and the site both read this one file, so nobody
 * retypes the text and the report, the figures and the page cannot drift apart.
 * `tests/test_report.py` asserts the byte equality against the attribution constant.
 */
export const DEQ_LIMITATION = {
  limitation: deqLimitation.limitation,
  citation: deqLimitation.citation,
  pairing: deqLimitation.pairing,
  credit: deqLimitation.credit,
  rendered: deqLimitation.rendered,
} as const;

export interface DeqLimitationProps {
  /**
   * `box` for a standing limitations panel, `inline` for a run of prose inside a
   * section that is already a limitation. Both render all four parts.
   */
  variant?: "box" | "inline";
  /** Anchor id, so the summary can link to the limitations section's copy. */
  id?: string;
}

/**
 * DEQ's limitation on this sensor network, verbatim and attributed.
 *
 * It is a quotation from a state agency, so it is rendered as a blockquote with its
 * attribution beneath and is never interleaved with GENARCH's own wording
 * (`site/src/content/deq-attribution.ts`, rule 4). It must not be paraphrased,
 * shortened or softened.
 *
 * The pairing sentence travels with it everywhere. On its own the quotation says the
 * sensors are not regulatory instruments; without the pairing sentence a reader can
 * still take a single hourly reading above the 24-hour level for an exceedance of
 * it, which is the misreading this block exists to prevent. The credit line is
 * DEQ's, pending the agency's own preferred wording.
 */
export function DeqLimitation({ variant = "box", id }: DeqLimitationProps) {
  return (
    <aside
      id={id}
      className={variant === "box" ? "report-deq-box callout" : "report-deq-inline"}
      aria-label="Virginia DEQ limitation on the sensor data"
      data-deq-limitation="true"
    >
      <blockquote className="report-deq-quote">
        <p>{DEQ_LIMITATION.limitation}</p>
        <footer className="report-deq-attribution">{DEQ_LIMITATION.citation}</footer>
      </blockquote>
      <p className="report-deq-pairing">{DEQ_LIMITATION.pairing}</p>
      <p className="report-deq-credit">{DEQ_LIMITATION.credit}</p>
    </aside>
  );
}

/**
 * The same four parts as one pre-assembled run, for a figure caption.
 *
 * Figure captions carry the block as the generator assembled it, because
 * `figures.json` stores exactly that string per figure and the PDF
 * post-processor counts its occurrences. Taking the text from the manifest rather
 * than rebuilding it here keeps the count honest: what the caption prints is what
 * the artifact records.
 */
export function FigureLimitation({ text }: { text: string }) {
  return (
    <p className="report-figure-limitation" data-figure-limitation="true">
      {text}
    </p>
  );
}
