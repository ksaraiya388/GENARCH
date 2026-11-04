/**
 * A small RFC 4180 reader for the report's table CSVs.
 *
 * The report tables cannot be split on commas. Two column labels and several cells
 * contain a comma of their own -- the broad ancestral category "Greater Middle
 * Eastern (Middle Eastern, North African or Persian)" is the clearest case, and the
 * `"Difference, slope"` family of headers in T03 is the same problem in the header
 * row. Splitting naively shifts every later column in those rows, which would
 * silently mis-render a published table rather than fail.
 *
 * Node has no CSV reader in its standard library and the site has no parser
 * dependency, so this is the parser: quoted fields, doubled quotes inside them,
 * CRLF or LF line endings, and nothing else. It is deliberately strict about
 * nothing -- `pipeline/report_lib/tables.py` writes these files with the standard
 * library's own writer, so the input is always well formed.
 */

/** Rows of fields, header row first, exactly as the file orders them. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  // Strip a leading BOM. Every file this reads is written without one, but a copy
  // that picked one up would otherwise turn the first header cell into a label no
  // `units` lookup can match.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\n") {
      endRow();
    } else if (ch === "\r") {
      // CRLF: the \n that follows closes the row.
    } else {
      field += ch;
    }
  }
  // A file ending in a newline leaves nothing pending; anything else is a last row.
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

/** Header row and body rows, with a trailing blank line discarded. */
export function parseCsvTable(text: string): { header: string[]; rows: string[][] } {
  const all = parseCsv(text).filter(
    (r) => r.length > 1 || (r.length === 1 && r[0].trim() !== "")
  );
  if (all.length === 0) return { header: [], rows: [] };
  return { header: all[0], rows: all.slice(1) };
}
