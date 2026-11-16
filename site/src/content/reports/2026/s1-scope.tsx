import { Cite, EditionDate, List, Item, N, P, Section } from "./bound";

export function Scope() {
  return (
    <Section number="1" id="scope" title="Scope">
      <P>
        GENARCH is a public, read-only web atlas that uses published, aggregate-level
        evidence about how environmental conditions and genetic variation are associated
        with disease. The atlas works at the population level and covers one county,
        Loudoun County, Virginia. It curates disease, exposure, gene and pathway records,
        links them in a knowledge graph, writes short mechanism briefs about selected
        gene, disease and exposure pathways, and carries a community module describing
        modelled exposure burden by region. Every record is traceable to a source class,
        with citation records under active backfill; the methods pages carry the current
        state of that backfill.
      </P>

      <P>
        It has no accounts, no logins and no user storage of any kind. It never accepts
        genotype files, variant call files or personal information, and there is nothing
        to upload anywhere on the site. It produces no individual-level output, no
        personalised summary and no per-person risk score. It makes no statement about
        any individual&apos;s chance of developing any condition, offers no clinical
        guidance and is not a diagnostic instrument. Every figure it publishes is a
        population-level or site-level aggregate.
      </P>

      <P>
        The geographic scope is Loudoun County, Virginia, with the neighbouring county
        appearing only if a published dataset covers both. The atlas content in this
        report is as of its atlas freeze date, <N k="inventory.frozen_at" />. The
        reprocessed monitoring data run from the first sensor hour in early March 2026 to
        the freeze&apos;s data cutoff at <N k="freeze.cutoff" /> local clock time, and the
        regulatory monitor record ends earlier, on 2026-08-10, where the released
        public-records request stops <Cite id="foia264646" />.
      </P>

      <P>
        The monitoring scope is narrower than DEQ&apos;s. DEQ retitled the project study
        area to cover Loudoun County and Prince William County in its{" "}
        <EditionDate id="deq2026oct09" /> edition <Cite id="deq2026oct09" />, and three
        sites outside Loudoun joined the
        network in September 2026: sites DC-10, DC-11 and DC-12 in the site key. They are
        named here and in the network description so the count of sites is honest, and
        no reading from any of them is reported. Every value in this report comes from
        the nine Loudoun County sites and the one regulatory monitor.
      </P>

      <P>The report is written for four kinds of reader:</P>
      <List>
        <Item>
          Residents and local civic groups who want to know what the published
          monitoring data do and do not show about the monitored corridor.
        </Item>
        <Item>
          Air quality staff at Virginia DEQ, for whom this is an outside check on
          statistics the agency already publishes weekly, together with a list of
          questions the published documents left open.
        </Item>
        <Item>
          Researchers in environmental epidemiology and statistical genetics, who need
          the methods and the input hashes to judge whether a number here is worth
          reusing.
        </Item>
        <Item>
          Anyone auditing the atlas itself: the module inventory, the evidence grading
          and the limitations are written to be checked rather than taken on trust.
        </Item>
      </List>
    </Section>
  );
}
