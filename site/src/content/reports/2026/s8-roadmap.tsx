import { List, Item, P, Section } from "./bound";

/**
 * The roadmap.
 *
 * Every item is dated, and every date is a commitment rather than an estimate, which
 * is why each one carries a KIAAN marker: the dates are pre-filled from what the data
 * and the open items imply, and they are the author's to confirm or move before this
 * version is cited. Nothing here is a promise about a finding, only about work.
 */
export function Roadmap() {
  return (
    <Section number="8" id="roadmap" title="Roadmap">
      <P>
        What follows is the planned work, in the order the data allow rather than the
        order of interest. Two items are blocked on someone else: the carbon monoxide
        analysis waits on an answer from DEQ, and the collocation and reconciliation
        windows wait on a public-records release.
      </P>

      <List>
        {/* KIAAN: confirm the March 2027 date. It assumes the network keeps collecting
            at the Loudoun sites through the winter with no further reconfiguration, which
            the September 2026 changes make less than certain. */}
        <Item>
          <strong>March 2027.</strong> The first twelve-month sensor record, counting from
          the first sensor hour on 2026-03-03, becomes available. A percentile read over a
          full year is the first one in this project not dominated by the season its record
          happens to cover, and it is what makes the record-length result in this version
          obsolete rather than merely qualified.
        </Item>

        {/* KIAAN: no date proposed. The paired-site analysis needs the two units' periods
            settled, and the unit attribution is recorded as unreliable within a day of any
            swap, so this may need DEQ's occupancy record rather than the dashboard's. */}
        <Item>
          <strong>Paired-site analysis.</strong> One unit occupied two sites over the
          record, which makes a within-unit comparison across locations possible and a
          cleaner instrument-versus-location test than any cross-unit comparison. It is
          outside this version and needs the unit occupancy periods confirmed first.
        </Item>

        {/* KIAAN: this one is not ours to schedule. The date should be stated as
            "after DEQ confirms", not as a month, unless you have an expected reply. */}
        <Item>
          <strong>Carbon monoxide, after the averaging period is resolved.</strong> The
          published sensor series cannot be described or compared until DEQ confirms
          whether it is an hourly or an eight-hour average. The regulatory comparison and
          the published statistics follow immediately once it is settled.
        </Item>

        {/* KIAAN: the scope decision is a judgement about what GENARCH is for, not a
            technical one. Loudoun-only is the atlas's stated frame; taking in a second
            county changes the subtitle and the community module as well as this report. */}
        <Item>
          <strong>Scope of the second county.</strong> Prince William County sites
          (deployed 2026-09-17 and 2026-10-22) are outside v1 scope (D5); scope decision
          for v2.
        </Item>

        {/* KIAAN: confirm whether the cross-ancestry phase is a report section or its own
            artifact. It is the one planned item that would produce new estimates rather
            than reprocess published ones, and it needs its own review. */}
        <Item>
          <strong>Cross-ancestry phase.</strong> Effect estimates across ancestry groups
          for the gene-environment relationships the atlas carries. This version reports
          the composition of the evidence base and computes no such estimate; the phase
          that does needs a method for transferability stated and reviewed before any
          number is published.
        </Item>

        {/* KIAAN: both halves of this are small and could ship before the next report.
            The ACS half is a two-part edit, because the page finds its ACS file by name. */}
        <Item>
          <strong>Page and report alignment.</strong> Page/report alignment: denominator
          labelling on /ancestry-equity and ACS release alignment (2023 vs 2024).
        </Item>

        {/* KIAAN: this is the one item that is a correctness fix rather than new work.
            It should probably precede everything above it. */}
        <Item>
          <strong>Knowledge graph reproducibility.</strong> Repair the graph builder and
          curate the missing gene records so that a clean rebuild reproduces the published
          node and edge counts, then rebaseline the editorial lint against the rebuilt
          graph. Until then the graph stays outside the reproducibility claim.
        </Item>

        {/* KIAAN: October 2027 assumes an annual cadence anchored on the report rather
            than on the data year. If the twelve-month record in March 2027 is the headline,
            an earlier date may suit the material better. */}
        <Item>
          <strong>October 2027.</strong> The Annual Report 2027, covering the first full
          year of the sensor record, the atlas as it then stands, and whichever of the open
          items above have closed.
        </Item>
      </List>
    </Section>
  );
}
