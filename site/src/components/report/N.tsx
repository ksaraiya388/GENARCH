import { formatNumber, reportNumber } from "@/lib/report-registry";

/**
 * What to render from the keyed record.
 *
 * `value` is the value alone, which is what nearly every sentence wants because the
 * unit usually reads better as part of the sentence. `with-unit` appends the
 * recorded unit for a standalone figure. `n` is the sample size behind the value and
 * `window` the period and day definition it was computed on, both of which appear in
 * methods prose where the value itself is beside the point.
 */
export type NFormat = "value" | "with-unit" | "n" | "window";

export interface NProps {
  /** Report year, bound once by the content directory rather than typed per use. */
  year: string;
  /** Key in numbers.json, inventory.json or chain.json. */
  k: string;
  fmt?: NFormat;
  /** Thousands separators. Off for a year, an id, or anything read as a code. */
  group?: boolean;
}

/**
 * One number from the report's registries.
 *
 * Every number in report prose comes through here. Nothing is typed by hand, so a
 * value cannot drift from the freeze it was computed at, and a key that no longer
 * exists fails `next build` with the key in the message rather than rendering an
 * empty span into a published report (docs/report-2026/CONTEXT.md section 8).
 *
 * The rendered text carries its key in `data-number-key`, which is what the review
 * notes and the source tests read: a reviewer can map any figure on the page back to
 * the registry entry and its input hashes without consulting the prose.
 */
export function N({ year, k, fmt = "value", group = true }: NProps) {
  const record = reportNumber(year, k);

  let text: string;
  switch (fmt) {
    case "with-unit":
      text = record.unit
        ? `${formatNumber(record, group)} ${record.unit}`
        : formatNumber(record, group);
      break;
    case "n":
      if (record.n === null) {
        throw new Error(
          `report ${year} key "${k}" records no n, so fmt="n" has nothing to render`
        );
      }
      text = formatNumber({ ...record, value: record.n, precision: 0 }, group);
      break;
    case "window":
      if (record.window === null) {
        throw new Error(
          `report ${year} key "${k}" records no window, so fmt="window" has nothing ` +
            "to render"
        );
      }
      text = record.window;
      break;
    default:
      text = formatNumber(record, group);
  }

  return (
    <span className="report-number" data-number-key={k} data-number-format={fmt}>
      {text}
    </span>
  );
}
