/**
 * Human labels for the report's table and figure ids.
 *
 * The ids are the generator's, and they are not quite a sequence: the daily
 * reconciliation ships as a 119-row table and a one-row summary, numbered T04 and
 * T04s, so a label cannot be a fixed-width slice of the id. Everything else is
 * T<nn> or F<nn>.
 */

const TABLE_SUFFIX: Record<string, string> = {
  s: ", summary",
};

function label(kind: string, id: string, suffixes: Record<string, string>): string {
  const short = id.split("_")[0];
  const match = /^[TF](\d+)([a-z]*)$/.exec(short);
  if (!match) return short;
  const [, digits, suffix] = match;
  return `${kind} ${Number(digits)}${suffixes[suffix] ?? ""}`;
}

/** "T03_collocation" or "T03" to "Table 3"; "T04s_daily_summary" to "Table 4, summary". */
export function tableLabel(id: string): string {
  return label("Table", id, TABLE_SUFFIX);
}

/** "F02_collocation" or "F02" to "Figure 2". */
export function figureLabel(id: string): string {
  return label("Figure", id, {});
}

/**
 * Whether a cell should be rendered right-aligned.
 *
 * A column of numbers is far easier to compare down a column when the digits line
 * up, and the report has several tables whose whole point is a reader comparing one
 * column against another. A signed difference and a value carrying a unit suffix
 * both count as numeric; a date does not, because a date column reads as a label.
 */
export function isNumericCell(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
  return /^[+-]?[\d,]+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed);
}
