import type { CorrelationPayload } from "@/lib/deq-data";

export interface DeqCorrelationMatrixProps {
  payload: CorrelationPayload;
}

/**
 * Pairwise hourly PM2.5 correlation across the deployed sensors.
 *
 * Rendered as a matrix of numbers rather than a colour heatmap. Every coefficient falls inside
 * a span of about 0.08, and a sequential ramp stretched across that span would make near-equal
 * values look categorically different — the visual claim would be larger than the data supports.
 * The hour count sits under each coefficient because it varies by a factor of three depending on
 * which sites were collecting at the same time.
 */
export function DeqCorrelationMatrix({ payload }: DeqCorrelationMatrixProps) {
  const { keys, pairs } = payload;

  const lookup = new Map<string, { r: number; n: number }>();
  for (const p of pairs) {
    lookup.set(`${p.a}|${p.b}`, { r: p.r, n: p.n });
    lookup.set(`${p.b}|${p.a}`, { r: p.r, n: p.n });
  }

  return (
    <table className="w-full min-w-[560px] border-collapse text-xs">
      <caption className="sr-only">
        Pairwise correlation of hourly PM2.5 between DEQ sensor sites, smoke-transport window
        excluded. Each cell gives the correlation coefficient and, beneath it, the number of hours
        both sites were collecting.
      </caption>
      <thead>
        <tr className="border-b border-white/[0.08] text-cool-mid">
          <th scope="col" className="py-2 pr-3 text-left font-medium">
            Site
          </th>
          {keys.map((k) => (
            <th key={k} scope="col" className="px-2 py-2 text-right font-mono font-medium">
              {k}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {keys.map((rowKey) => (
          <tr key={rowKey} className="border-b border-white/[0.04]">
            <th scope="row" className="py-2 pr-3 text-left font-mono font-normal text-surface-white">
              {rowKey}
            </th>
            {keys.map((colKey) => {
              if (rowKey === colKey) {
                return (
                  <td key={colKey} className="px-2 py-2 text-right text-cool-dark">
                    —
                  </td>
                );
              }
              const cell = lookup.get(`${rowKey}|${colKey}`);
              return (
                <td key={colKey} className="px-2 py-2 text-right align-top">
                  <span className="block font-mono text-surface-white">
                    {cell ? cell.r.toFixed(3) : "—"}
                  </span>
                  <span className="block font-mono text-[10px] text-cool-mid">
                    {cell ? `n=${cell.n.toLocaleString("en-US")}` : ""}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
