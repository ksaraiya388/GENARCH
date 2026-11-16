/**
 * Human labels for the report's table and figure ids.
 *
 * Figures are numbered by their id (F02 is Figure 2), because the generator writes
 * them in reading order. Tables are numbered by order of first appearance in the
 * report body, which the generator's ids do not follow: the inventory table is the
 * first a reader meets and the input manifest the last (DECISIONS.md D47). The ids
 * and the CSV names stay as they are; only the printed label is derived here.
 */

import { tableNumber } from "@/lib/report-table-order";

/** "T08_module_inventory" or "T08" to "Table 1", by order of first appearance. */
export function tableLabel(year: string, id: string): string {
  return `Table ${tableNumber(year, id)}`;
}

/** "F02_collocation" or "F02" to "Figure 2". */
export function figureLabel(id: string): string {
  const short = id.split("_")[0];
  const match = /^F(\d+)$/.exec(short);
  return match ? `Figure ${Number(match[1])}` : short;
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
