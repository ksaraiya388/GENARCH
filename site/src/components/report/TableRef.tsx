import { tableLabel } from "./labels";

/**
 * A reference to one of the report's own tables from prose: "Table 2".
 *
 * Tables are numbered by order of first appearance, so a number typed into a
 * sentence would go stale the moment a table moved. This renders the same label the
 * table's own caption prints.
 */
export function TableRef({ year, id }: { year: string; id: string }) {
  return (
    <span className="report-table-ref" data-table-ref={id}>
      {tableLabel(year, id)}
    </span>
  );
}
