/**
 * The report components, bound to this report's year.
 *
 * Server components cannot share a React context, so the year would otherwise be a
 * prop on every number, table and figure in the body -- several hundred repetitions
 * of the one fact that is already in this directory's name, and several hundred
 * chances to pass the wrong one. Binding it once here keeps the prose files reading
 * as prose and makes the year a single-line change if a later report reuses them.
 */

import {
  N as NBase,
  ReportTable as ReportTableBase,
  ReportFigure as ReportFigureBase,
} from "@/components/report";
import type { NProps, ReportFigureProps, ReportTableProps } from "@/components/report";

export const YEAR = "2026";

export function N(props: Omit<NProps, "year">) {
  return <NBase year={YEAR} {...props} />;
}

export function ReportTable(props: Omit<ReportTableProps, "year">) {
  return <ReportTableBase year={YEAR} {...props} />;
}

export function ReportFigure(props: Omit<ReportFigureProps, "year">) {
  return <ReportFigureBase year={YEAR} {...props} />;
}

export {
  Cite,
  References,
  DeqLimitation,
  Section,
  Sub,
  P,
  Lead,
  Callout,
  OrderedList,
  List,
  Item,
  Glossary,
  Term,
} from "@/components/report";
