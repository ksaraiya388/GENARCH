import { formatNumber, reportNumber } from "@/lib/report-registry";

/**
 * What to render from the keyed record.
 *
 * `value` is the value alone, which is what nearly every sentence wants because the
 * unit usually reads better as part of the sentence. `with-unit` appends the
 * recorded unit for a standalone figure. `n` is the sample size behind the value and
 * `window` the period and day definition it was computed on, both of which appear in
 * methods prose where the value itself is beside the point. `ordinal` renders a
 * whole-number rank as a word ("fourth"), because "ranks 4" reads as a typo. `count`
 * renders a whole-number count of zero as "none" and any other count as its value
 * (DECISIONS.md D58), so "none of the six" never prints as "0 of the six".
 */
export type NFormat = "value" | "with-unit" | "n" | "window" | "ordinal" | "count";

const ORDINALS = [
  "zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
  "eighth", "ninth", "tenth", "eleventh", "twelfth",
];

/** A whole-number rank as an ordinal word; fails the build outside the table. */
function ordinal(year: string, k: string, value: unknown): string {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 ||
      value >= ORDINALS.length) {
    throw new Error(
      `report ${year} key "${k}" is ${String(value)}, which fmt="ordinal" cannot render ` +
        `as a word (whole numbers 1 to ${ORDINALS.length - 1})`
    );
  }
  return ORDINALS[value];
}

export interface NProps {
  /** Report year, bound once by the content directory rather than typed per use. */
  year: string;
  /** Key in numbers.json, inventory.json or chain.json. */
  k: string;
  fmt?: NFormat;
  /** Thousands separators. Off for a year, an id, or anything read as a code. */
  group?: boolean;
  /**
   * Print at fewer decimals than the key records, without changing the key. Only
   * trailing zeros may be dropped: a value that would round fails the build, so this
   * shortens a display and never alters a number.
   */
  digits?: number;
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
export function N({ year, k, fmt = "value", group = true, digits }: NProps) {
  const stored = reportNumber(year, k);
  let record = stored;
  if (digits !== undefined) {
    if (typeof stored.value !== "number" || stored.precision === null) {
      throw new Error(`report ${year} key "${k}" is not a rounded number; digits does not apply`);
    }
    const scaled = stored.value * 10 ** digits;
    if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
      throw new Error(
        `report ${year} key "${k}" is ${stored.value}; printing it at ${digits} decimal(s) ` +
          "would round it rather than drop trailing zeros"
      );
    }
    record = { ...stored, precision: Math.min(digits, stored.precision) };
  }

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
    case "ordinal":
      text = ordinal(year, k, record.value);
      break;
    case "count":
      if (typeof record.value !== "number" || !Number.isInteger(record.value) ||
          record.value < 0) {
        throw new Error(
          `report ${year} key "${k}" is ${String(record.value)}, which fmt="count" cannot ` +
            "render (whole numbers from 0)"
        );
      }
      text = record.value === 0 ? "none" : formatNumber(record, group);
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
