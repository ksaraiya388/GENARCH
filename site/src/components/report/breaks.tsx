import type { ReactNode } from "react";

/**
 * A URL, a path or a code identifier with a break opportunity after each separator.
 *
 * A long token has to break somewhere at print width. `word-break: break-all` broke
 * it at any character ("htt ps://", "linked_ex posures"); this offers the separators
 * instead (after "/", "_", "." and "?", "&", "=", "#"), and the stylesheet's
 * `overflow-wrap: anywhere` breaks inside a part only when a part alone is wider than
 * the line.
 */
export function separatorBreaks(text: string): ReactNode {
  const parts = text.split(/(?<=[/_.?&=#])(?!\/)/);
  if (parts.length === 1) return text;
  const out: ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i > 0) out.push(<wbr key={`w${i}`} />);
    out.push(part);
  });
  return out;
}
