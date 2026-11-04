import { References } from "./bound";
import { AppendixA, AppendixB, AppendixC, AppendixD } from "./appendices";
import { AncestryEvidenceBase } from "./s6-ancestry";
import { Cover } from "./cover";
import { DataAndProvenance } from "./s2-data";
import { DataCenterAlley } from "./s5-dca";
import { Limitations } from "./s7-limitations";
import { Methods } from "./s3-methods";
import { ModuleInventory } from "./s4-inventory";
import { Roadmap } from "./s8-roadmap";
import { Scope } from "./s1-scope";
import { Summary } from "./summary";

export { frontmatter, apaCitation, bibtexCitation, isCitable, isPending } from "./frontmatter";
export type { ReportFrontmatter } from "./frontmatter";

/**
 * The report's table of contents, in document order.
 *
 * The page renders this as navigation and the print stylesheet uses the same ids to
 * start each top-level section on a fresh page, so the two cannot disagree about what
 * the sections are.
 */
export const SECTIONS: ReadonlyArray<{ number?: string; id: string; title: string }> = [
  { id: "summary", title: "Summary" },
  { number: "1", id: "scope", title: "Scope" },
  { number: "2", id: "data", title: "Data and provenance" },
  { number: "3", id: "methods", title: "Methods" },
  { number: "4", id: "inventory", title: "Module inventory" },
  {
    number: "5",
    id: "data-center-alley",
    title: "The monitored corridor: reprocessing DEQ's published data",
  },
  { number: "6", id: "ancestry", title: "The ancestry composition of the evidence base" },
  { number: "7", id: "limitations", title: "Limitations" },
  { number: "8", id: "roadmap", title: "Roadmap" },
  { number: "A", id: "appendix-a", title: "Reproducibility" },
  { number: "B", id: "appendix-b", title: "Tables in full" },
  { number: "C", id: "appendix-c", title: "Glossary" },
  { number: "D", id: "appendix-d", title: "Changelog" },
  { id: "references", title: "References" },
];

/** The report body, cover through references. */
export function ReportBody() {
  return (
    <div className="report-body">
      <Cover />
      <Summary />
      <Scope />
      <DataAndProvenance />
      <Methods />
      <ModuleInventory />
      <DataCenterAlley />
      <AncestryEvidenceBase />
      <Limitations />
      <Roadmap />
      <AppendixA />
      <AppendixB />
      <AppendixC />
      <AppendixD />
      <div className="report-section report-page-break" id="references">
        <References />
      </div>
    </div>
  );
}
