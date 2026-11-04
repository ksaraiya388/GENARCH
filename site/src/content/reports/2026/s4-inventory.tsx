import { N, P, ReportTable, Section } from "./bound";

export function ModuleInventory() {
  return (
    <Section number="4" id="inventory" title="Module inventory">
      <P>
        At the atlas freeze date, <N k="inventory.frozen_at" />, the atlas held{" "}
        <N k="inventory.record_total" /> records across eight modules:{" "}
        <N k="inventory.diseases.records" /> disease records,{" "}
        <N k="inventory.exposures.records" /> exposure records,{" "}
        <N k="inventory.genes.records" /> gene records,{" "}
        <N k="inventory.pathways.records" /> pathway records,{" "}
        <N k="inventory.mechanism_briefs.records" /> mechanism briefs,{" "}
        <N k="inventory.community_regions.records" /> community regions,{" "}
        <N k="inventory.ancestry_modules.records" /> cross-ancestry modules and the
        knowledge graph, which carries <N k="inventory.graph.nodes" /> nodes and{" "}
        <N k="inventory.graph.edges" /> edges. Seven of the eight modules are emitted by
        the current pipeline and reproduce from it. The graph does not, for the reason
        given in the methods and repeated in the limitations, and its row records that
        status rather than hiding it behind a count. The brief total counts every brief
        record under the briefs directory, including one that is not published and so is
        not routable or linkable on the site.
      </P>

      <ReportTable id="T08" />
    </Section>
  );
}
