import { Cite, EditionDate, List, Item, N, P, Section } from "./bound";

/**
 * The roadmap.
 *
 * Items are in the order the work can proceed, with the one correctness fix first.
 * Some carry a month and some do not: a month is given where the data or the
 * report cycle fixes one, and an item that depends on DEQ or on a records release
 * says so instead of guessing a date. Every month here is a commitment rather than
 * an estimate. Nothing here is a promise about a finding, only about work.
 */
export function Roadmap() {
  return (
    <Section number="8" id="roadmap" title="Roadmap">
      <P>
        What follows is the planned work, in the order the data allow rather than the
        order of interest. Three items are blocked on someone else: the carbon monoxide
        analysis and the paired-site analysis wait on DEQ, and the collocation and
        reconciliation windows wait on a public-records release.
      </P>

      <List>
        <Item>
          <strong>Knowledge graph reproducibility.</strong> Repair the graph builder and
          curate the missing gene records so that a clean rebuild reproduces the published
          node and edge counts, then rebaseline the editorial lint against the rebuilt
          graph. Until then the graph stays outside the reproducibility claim.
        </Item>

        <Item>
          <strong>Mechanism brief references.</strong> Correct the citation errors this
          report&apos;s reference check found in the published mechanism brief, so that the
          brief&apos;s record matches the corrected reference list here.
        </Item>

        <Item>
          <strong>May 2027.</strong> The first twelve-month record at a single Loudoun
          site. After the freeze, sensor collection ended at the two sites that had
          collected since <N k="network.first_start" />, DC-01 and DC-02{" "}
          <Cite id="deq2026oct30" />
          <Cite id="deq2026nov06" />, so no site reaches twelve months in March 2027.
          Site DC-04 has collected since <N k="network.start.DC-04" /> and reaches twelve
          months in May 2027 if it keeps collecting. A percentile read over a full year is the first one in
          this project not dominated by the season its record happens to cover.
        </Item>

        <Item>
          <strong>Collocated comparison, after the freeze.</strong> Sensor collection at
          the collocated site ended on <N k="deq.postfreeze.dc01_collection_end" /> and
          the unit moved to a new Loudoun County site <Cite id="deq2026nov06" />;
          DEQ&apos;s regulatory monitor there continues. The weekly collocated comparison
          has therefore ended unless DEQ places a sensor beside a regulatory monitor again.
          Any later collocation analysis depends on that and on the pending records
          request.
        </Item>

        <Item>
          <strong>Paired-site analysis.</strong> One unit occupied two sites over the
          record, which makes a within-unit comparison across locations possible and a
          cleaner instrument-versus-location test than any cross-unit comparison. It is
          outside this version and needs the unit occupancy periods confirmed first. It
          has no date: it needs DEQ&apos;s occupancy record for the unit rather than the
          dashboard&apos;s.
        </Item>

        <Item>
          <strong>Carbon monoxide, after the averaging period is resolved.</strong> The
          published sensor series cannot be described or compared until DEQ confirms
          whether it is an hourly or an eight-hour average. The regulatory comparison and
          the published statistics follow immediately once it is settled.
        </Item>

        <Item>
          <strong>Scope of the second county.</strong> DEQ&apos;s network now includes
          sites in Prince William County, deployed in{" "}
          <N k="network.reconfiguration_month" /> and, after the freeze, on{" "}
          <N k="deq.postfreeze.pw_sites_added" /> (DEQ&apos;s{" "}
          <EditionDate id="deq2026oct30" /> edition <Cite id="deq2026oct30" />). They are
          outside the scope of this version. Whether the atlas and this report take in a
          second county is a decision about what GENARCH is for, and it will be made for
          the next report.
        </Item>

        <Item>
          <strong>Cross-ancestry phase.</strong> Effect estimates across ancestry groups
          for the gene-environment relationships the atlas carries. This version reports
          the composition of the evidence base and computes no such estimate; the phase
          that does needs a method for transferability stated and reviewed before any
          number is published. It will be its own artifact with its own methods review,
          not a section of an annual report.
        </Item>

        <Item>
          <strong>Page and report alignment.</strong> The ancestry and equity page labels
          its denominator differently from this report and reads the{" "}
          <N k="ancestry.page_acs_release" /> ACS release where this report reads{" "}
          <N k="ancestry.acs.release" />. Both will be aligned ahead of the next report.
        </Item>

        <Item>
          <strong>October 2027.</strong> The Annual Report 2027, covering the first full
          year of the network&apos;s record, the atlas as it then stands, and whichever of
          the open items above have closed.
        </Item>
      </List>
    </Section>
  );
}
