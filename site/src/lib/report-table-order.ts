/**
 * Table numbers by order of first appearance in the report body.
 *
 * Tables carry the generator's file IDs (T01_sources, T08_module_inventory), which
 * number them in the order the generator writes them rather than the order a reader
 * meets them. The printed number is assigned here instead: the body's source files
 * are read in document order (`body-order.json` in the report's content directory),
 * every table a page renders is collected in source order, and each table takes the
 * position of its first appearance. A figure renders its own data table, so a figure
 * counts as the first appearance of that table. The CSV names and the IDs in
 * tables.json are unchanged (DECISIONS.md D47).
 *
 * Read at build time, like every other report artifact. An ID that resolves to no
 * table, or a table the body never renders, fails the build.
 */

import fs from "fs";
import path from "path";

import { reportFigure, reportTable, tableRegistry } from "./report-registry";

const TABLE = /<ReportTable\s[^>]*?\bid="([^"]+)"/g;
const FIGURE = /<ReportFigure\s([^>]*?)\/>/g;

const orderCache = new Map<string, string[]>();

function contentDir(year: string): string {
  const candidates = [
    path.join(process.cwd(), "src", "content", "reports", year),
    path.join(process.cwd(), "site", "src", "content", "reports", year),
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, "body-order.json")));
  if (!found) {
    throw new Error(`report ${year}: no body-order.json under src/content/reports/${year}`);
  }
  return found;
}

/** Full table IDs in order of first appearance in the report body. */
export function tableOrder(year: string): string[] {
  const cached = orderCache.get(year);
  if (cached) return cached;

  const dir = contentDir(year);
  const { files } = JSON.parse(
    fs.readFileSync(path.join(dir, "body-order.json"), "utf-8")
  ) as { files: string[] };

  const order: string[] = [];
  const add = (id: string) => {
    const full = reportTable(year, id).id;
    if (!order.includes(full)) order.push(full);
  };

  for (const file of files) {
    const source = fs
      .readFileSync(path.join(dir, file), "utf-8")
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ");
    const hits: { at: number; table: string }[] = [];
    for (const m of Array.from(source.matchAll(TABLE))) {
      hits.push({ at: m.index ?? 0, table: m[1] });
    }
    for (const m of Array.from(source.matchAll(FIGURE))) {
      const attrs = m[1];
      const figureId = /\bid="([^"]+)"/.exec(attrs)?.[1];
      if (!figureId) continue;
      const explicit = /\btableId="([^"]+)"/.exec(attrs)?.[1];
      hits.push({
        at: m.index ?? 0,
        table: explicit ?? reportFigure(year, figureId).data_table,
      });
    }
    hits.sort((a, b) => a.at - b.at);
    for (const hit of hits) add(hit.table);
  }

  const rendered = new Set(order);
  const unrendered = Array.from(new Set(Array.from(tableRegistry(year).values()).map((t) => t.id)))
    .filter((id) => !rendered.has(id));
  if (unrendered.length > 0) {
    throw new Error(
      `report ${year}: table(s) in the manifests that the body never renders: ` +
        unrendered.join(", ")
    );
  }

  orderCache.set(year, order);
  return order;
}

/** The printed number of a table: its position of first appearance, from 1. */
export function tableNumber(year: string, id: string): number {
  const full = reportTable(year, id).id;
  const position = tableOrder(year).indexOf(full);
  if (position < 0) throw new Error(`report ${year}: table ${id} is never rendered`);
  return position + 1;
}
