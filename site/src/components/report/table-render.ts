/**
 * Per-table render settings for the report's tables.
 *
 * Everything here is presentation. The CSV each table reads is the published,
 * byte-compared artifact and stays as the generator wrote it: an empty cell stays
 * empty in the CSV, a count stays unformatted and a licence stays a full sentence.
 * What a reader sees on the page and in the PDF is decided here instead, so a
 * formatting change never moves a byte the reproducibility check compares.
 *
 * Column widths apply on the print route only (print.css), where the measure is a
 * fixed 6.5in and an automatic layout lets a wide table run off the page. The
 * screen report keeps its automatic layout and its horizontal scroll.
 */

export type CellFormat = "count" | "share2" | "trailing1";

export interface TableRender {
  /** Print-route column widths, by column name. Every column must be named. */
  widths?: Record<string, string>;
  /** Columns set in monospace and allowed to break anywhere (hashes). */
  mono?: string[];
  /** Columns allowed to break anywhere (URLs, long timestamps). */
  breakAnywhere?: string[];
  /** Text for an empty cell, by column name. */
  emptyAs?: Record<string, string>;
  /** Number formats, by column name. Non-numeric cells pass through unchanged. */
  format?: Record<string, CellFormat>;
  /**
   * A column whose long, repeated sentence is replaced by a short label per row,
   * with each sentence printed once in the table note. An unknown sentence fails
   * the build rather than printing unlabelled.
   */
  shortLabels?: { column: string; labels: Record<string, string> };
  /** Table notes, printed after the source line. */
  notes?: string[];
  /** Replaces the generated "Units:" sentence. */
  unitsNote?: string;
  /** Set the table at 6.5pt on the print route, whatever its column count. */
  small?: boolean;
  /** State units under the table rather than in the header row. */
  unitsBelow?: boolean;
  /**
   * Columns whose space- or slash-separated tokens never break inside (gene symbols,
   * locus labels). A line may break only between tokens or after a slash.
   */
  atomic?: string[];
}

/**
 * Break points for header words in fixed-width tables, as soft hyphens.
 *
 * A fixed column narrower than one of its header words would otherwise break the
 * word wherever the edge falls ("Compar / ison"). A soft hyphen is invisible unless
 * the line breaks there, and then prints as a hyphen at a syllable boundary.
 */
const SHY = "\u00ad";
const HEADER_SYLLABLES: Record<string, string> = {
  Comparison: "Com-par-i-son",
  intercept: "in-ter-cept",
  Difference: "Dif-fer-ence",
  Associations: "As-so-ci-a-tions",
  Distinct: "Dis-tinct",
  variants: "var-i-ants",
  European: "Eu-ro-pe-an",
  American: "Amer-i-can",
  Caribbean: "Car-ib-be-an",
  African: "Af-ri-can",
  unspecified: "un-spec-i-fied",
  Hispanic: "His-pan-ic",
  Cytoband: "Cy-to-band",
  Greater: "Great-er",
  Eastern: "East-ern",
  Persian: "Per-sian",
  ancestry: "an-ces-try",
  Evidence: "Ev-i-dence",
  evidence: "ev-i-dence",
  Licence: "Li-cence",
  GENARCH: "GEN-ARCH",
  squared: "squared",
  Records: "Rec-ords",
  Paired: "Paired",
  record: "rec-ord",
};

export function softHyphenate(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word) =>
    word in HEADER_SYLLABLES ? HEADER_SYLLABLES[word].split("-").join(SHY) : word
  );
}

const KUNAK_LICENCE =
  "Fully redistributable with credit that the data belong to Virginia DEQ (per DEQ " +
  "staff, 2026-08-10). Preferred attribution line pending from DEQ Communications.";
const FOIA_LICENCE =
  "Public records released in full under the Virginia Freedom of Information Act, no " +
  "redactions, no cost. Credit Virginia DEQ.";
const DEQ_REPORT_LICENCE =
  "Public record. Virginia DEQ confirmed redistributable with credit to Virginia DEQ.";

export const TABLE_RENDER: Record<string, TableRender> = {
  T01_sources: {
    widths: {
      Source: "1.49in",
      Origin: "1.35in",
      Licence: "0.62in",
      "Export date": "0.84in",
      "Data cutoff": "0.7in",
      "SHA-256": "1.46in",
    },
    mono: ["SHA-256"],
    small: true,
    unitsBelow: true,
    breakAnywhere: ["Origin"],
    emptyAs: { "Export date": "not applicable" },
    notes: [
      "Export date does not apply to the DEQ weekly editions, which are downloads " +
        "rather than dashboard exports; their retrieval dates are in the Sources list.",
    ],
    shortLabels: {
      column: "Licence",
      labels: {
        [KUNAK_LICENCE]: "Sensor data",
        [FOIA_LICENCE]: "FOIA release",
        [DEQ_REPORT_LICENCE]: "DEQ edition",
      },
    },
  },
  T03_collocation: {
    widths: {
      Comparison: "0.48in",
      "DEQ intercept": "0.44in",
      "DEQ slope": "0.36in",
      "DEQ R-squared": "0.42in",
      "GENARCH intercept": "0.44in",
      "GENARCH slope": "0.38in",
      "GENARCH R-squared": "0.44in",
      "Difference, intercept": "0.44in",
      "Difference, slope": "0.38in",
      "Difference, R-squared": "0.44in",
      "Paired hours": "0.36in",
      "Period start": "0.62in",
      "Period end": "0.62in",
      Status: "0.62in",
    },
  },
  T02_site_key: {
    emptyAs: { "Active end": "open at freeze" },
    notes: [
      "Record days is the site total, repeated on each unit row of a site that had " +
        "more than one unit.",
    ],
  },
  T04s_daily_summary: {
    // DEQ truncates to one decimal, so a difference of two published-precision values
    // has one meaningful decimal. The key keeps its recorded precision.
    format: { "Maximum absolute difference (µg/m³)": "trailing1" },
  },
  T08_module_inventory: {
    emptyAs: { "Graph nodes": "n/a", "Graph edges": "n/a" },
  },
  T09_chain_evidence: {
    widths: {
      Step: "0.38in",
      From: "0.95in",
      To: "0.95in",
      "Evidence class": "0.68in",
      "Class read from an atlas record": "0.66in",
      "Source of the evidence class": "1.96in",
      "As of (atlas freeze)": "0.84in",
    },
    breakAnywhere: ["Source of the evidence class"],
  },
  T10_gwas_ancestry_composition: {
    format: {
      "Discovery individuals": "count",
      Share: "share2",
      "Share, single-category rows only": "share2",
    },
    notes: [
      "A half-count arises where a sample naming two categories is split equally " +
        "between them.",
    ],
  },
  T11_loci_by_ancestry: {
    widths: {
      Locus: "0.52in",
      Cytoband: "0.54in",
      Genes: "0.48in",
      Associations: "0.5in",
      "Distinct variants": "0.42in",
      European: "0.42in",
      "African American or Afro-Caribbean": "0.42in",
      "African unspecified": "0.42in",
      "East Asian": "0.34in",
      "South Asian": "0.34in",
      "Central Asian": "0.4in",
      "Hispanic or Latin American": "0.4in",
      "Greater Middle Eastern (Middle Eastern, North African or Persian)": "0.5in",
      NR: "0.26in",
      "Associations with no initial-stage ancestry row": "0.5in",
    },
    unitsNote: "counts",
    atomic: ["Locus", "Cytoband", "Genes"],
  },
  T12_loudoun_acs_context: {
    format: { Residents: "count", Share: "share2", "Margin of error": "count" },
  },
};

const NUMERIC = /^[+-]?\d+(\.\d+)?$/;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A cell under one of the formats above. Text that is not a number is unchanged. */
export function formatCell(value: string, format: CellFormat): string {
  const trimmed = value.trim();
  if (!NUMERIC.test(trimmed)) return value;
  if (format === "share2") return Number(trimmed).toFixed(2);
  if (format === "trailing1") {
    // One decimal, dropping trailing zeros only; a value that would round is an error.
    const scaled = Number(trimmed) * 10;
    if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
      throw new Error(`cell ${trimmed}: one decimal would round it, not drop trailing zeros`);
    }
    return Number(trimmed).toFixed(1);
  }
  const [whole, fraction] = trimmed.split(".");
  const sign = whole.startsWith("-") || whole.startsWith("+") ? whole[0] : "";
  const grouped = groupThousands(sign ? whole.slice(1) : whole);
  return fraction === undefined ? sign + grouped : `${sign}${grouped}.${fraction}`;
}

/**
 * Check a render config against the table it is for, so a renamed column fails the
 * build instead of silently dropping a width or a format.
 */
export function checkRender(tableId: string, header: string[], render: TableRender): void {
  const named = [
    ...Object.keys(render.widths ?? {}),
    ...(render.mono ?? []),
    ...(render.breakAnywhere ?? []),
    ...Object.keys(render.emptyAs ?? {}),
    ...Object.keys(render.format ?? {}),
    ...(render.shortLabels ? [render.shortLabels.column] : []),
    ...(render.atomic ?? []),
  ];
  const missing = named.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    throw new Error(
      `table ${tableId}: render config names column(s) the table does not have: ` +
        missing.join(", ")
    );
  }
  if (render.widths) {
    const unset = header.filter((column) => !(column in render.widths!));
    if (unset.length > 0) {
      throw new Error(`table ${tableId}: no print width for column(s): ${unset.join(", ")}`);
    }
  }
}
