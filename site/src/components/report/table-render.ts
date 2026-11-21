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
  /** A printed heading in place of the CSV column name, which stays unchanged. */
  headerLabels?: Record<string, string>;
  /** Replace a cell's text when another cell in its row has a given value. */
  whenRow?: { column: string; matchColumn: string; matchValue: string; text: string }[];
  /** Append a marker to listed values of one column, keyed to a table note. */
  suffix?: { column: string; values: Record<string, string> };
  /** Set the table at 6.5pt on the print route, whatever its column count. */
  small?: boolean;
  /** State units under the table rather than in the header row. */
  unitsBelow?: boolean;
  /**
   * Columns whose space- or slash-separated tokens never break inside (gene symbols,
   * locus labels). A line may break only between tokens or after a slash.
   */
  atomic?: string[];
  /**
   * Print the table transposed: each CSV column becomes a row headed by its column
   * name, and each CSV row becomes a column headed by its first cell. Render layer
   * only; the CSV, its columns and its archive name are unchanged (DECISIONS.md D62).
   * `corner` heads the row-label column; `widths` gives the print width of that
   * column (under `corner`) and of each CSV row's column (under its first cell).
   * Headers then break between words only: no soft hyphens are inserted.
   */
  transpose?: { corner: string; widths: Record<string, string> };
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
  "Fully redistributable with credit that the data belong to Virginia DEQ, confirmed by " +
  "agency staff. Preferred attribution line pending from DEQ Communications.";
const FOIA_LICENCE =
  "Public records released in full under the Virginia Freedom of Information Act, no " +
  "redactions, no cost. Credit Virginia DEQ.";
const DEQ_REPORT_LICENCE =
  "Public record. Redistributable with credit to Virginia DEQ, confirmed by agency staff.";

const NR_NOTE =
  "NR is the catalogue's own label for a sample whose ancestry was not reported.";

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
    // Printed transposed: statistics as rows, the four regressions as columns (D62).
    transpose: {
      corner: "Statistic",
      widths: {
        Statistic: "2in",
        "APEX 14 PM2.5": "1.1in",
        "APEX 5 PM2.5": "1.1in",
        "APEX 14 NO2": "1.1in",
        "APEX 5 NO2": "1.1in",
      },
    },
    format: { "Paired hours": "count" },
    // The APEX 5 NO2 DEQ values are staff-supplied, not printed (note †, B7).
    suffix: { column: "Comparison", values: { "APEX 5 NO2": " †" } },
  },
  T02_site_key: {
    emptyAs: { "Active end": "open at freeze" },
    headerLabels: { "DEQ published name": "Name on DEQ's dashboard" },
    // Outside v1 scope: the record-day count is withheld for these sites (D5, S13).
    whenRow: [
      {
        column: "Record days",
        matchColumn: "County",
        matchValue: "Prince William County",
        text: "outside scope",
      },
    ],
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
      NR_NOTE + " Other is the catalogue's own residual category.",
    ],
  },
  T11_loci_by_ancestry: {
    // Printed transposed: ancestry categories as rows, the loci as columns (D62).
    transpose: {
      corner: "Locus",
      widths: {
        Locus: "2.2in",
        "17q12-21 (ORMDL3/GSDMB)": "0.84in",
        IL33: "0.84in",
        TSLP: "0.84in",
        IL1RL1: "0.84in",
        "5q31 (RAD50/IL13)": "0.84in",
      },
    },
    unitsNote: "counts",
    atomic: ["Locus", "Cytoband", "Genes"],
    notes: [NR_NOTE],
  },
  // A site code is one token and never breaks (DC-01, not DC- / 01).
  T05_p98_common_window: {
    atomic: ["Site code"],
  },
  // Eleven columns since the smoke-excluded record days joined (audit round 2, S6):
  // set small so the table stays inside the 6.5in measure.
  T06_p98_full_record_variants: {
    atomic: ["Site code"],
    small: true,
  },
  T07_correlation_matrix: {
    format: {
      "Overlapping hours": "count",
      "Overlapping hours, smoke window included": "count",
    },
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
    ...Object.keys(render.headerLabels ?? {}),
    ...(render.whenRow ?? []).flatMap((rule) => [rule.column, rule.matchColumn]),
    ...(render.suffix ? [render.suffix.column] : []),
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
