import { Cite, DeqLimitation, List, Item, N, P, Section, Sub } from "./bound";

export function Limitations() {
  return (
    <Section number="7" id="limitations" title="Limitations">
      <DeqLimitation id="limitations-deq" />

      <Sub number="7.1" id="limitations-instruments" title="What the instruments can support">
        <P>
          The regulatory form of the 24-hour standard is the{" "}
          <N k="naaqs.percentile" />th percentile of daily 24-hour averages, averaged over{" "}
          <N k="naaqs.averaging_years" /> consecutive years, at a level of{" "}
          <N k="naaqs.daily_standard" /> µg/m³; the separate annual standard is{" "}
          <N k="naaqs.annual_standard" /> µg/m³ as revised in 2024{" "}
          <Cite id="cfr5018" />
          <Cite id="cfr50appn" />. Neither form can be evaluated against a low-cost
          sensor record, and neither is evaluated anywhere in this report. Every
          percentile reported here is the statistic DEQ publishes for these sensors, not
          a compliance determination.
        </P>
        <P>
          Both the sensors and the regulatory monitor measure fine particulate matter
          optically rather than gravimetrically. That matters for the one comparison a
          reader is most likely to want: when the two disagree during a smoke episode,
          the disagreement cannot be attributed to sensor performance, because there is
          no gravimetric reference in the record to arbitrate between them. The sensor
          files also carry no null code, no flag and no qualifier column, and the
          dashboard states that values are published as soon as they are detected and
          before quality assurance, so a disagreement between the two sources has at
          least three candidate explanations (sensor accuracy, the absence of quality
          assurance on one side, and timestamp convention), and this report attributes it
          to none of them.
        </P>
      </Sub>

      <Sub number="7.2" id="limitations-record" title="Record length, season and the end of the regulatory data">
        <P>
          The sensor records differ by a factor of three in length and are not
          contemporaneous, which is the subject of one of the four results rather than a
          footnote to it. A 98th percentile read from{" "}
          <N k="network.record_days.DC-06" /> days of high summer is a different order
          statistic from one read from <N k="network.record_days.DC-01" /> days spanning
          three seasons, and the two cannot be ranked against each other. Restricting to
          the common window removes the unequal-length problem; it does not remove the
          unequal-season one, because the common window falls entirely in high summer and
          contains the wildfire smoke period.
        </P>
        <P>
          The regulatory monitor record ends 2026-08-10 under the released public-records
          request <Cite id="foia264646" />, with the last complete day 2026-08-09. That
          caps the collocation fits and the daily reconciliation at a date the sensor
          record runs well past, and no later cutoff is computable for either, because
          both sides of each hourly pair are needed. A follow-up request is pending. One
          consequence is specific and worth naming: DEQ&apos;s corrected coefficients for
          one regression were computed over a window that runs past this report&apos;s
          cutoff, and that comparison cannot be aligned from this side at all.
        </P>
      </Sub>

      <Sub number="7.3" id="limitations-open" title="Open items">
        <P>
          Each of these is unresolved at the freeze. They are listed rather than
          summarised because each one bounds a specific claim.
        </P>
        <List>
          <Item>
            Whether DEQ&apos;s published collocation plots carried axis limits. The agency
            traced one earlier regression to limits in its plotting call that had bounded
            the model fit as well as the view. If the other plots carried limits too, the
            agreeing fits may be reproducing fits computed on a clipped range. Asked of
            DEQ; awaiting an answer.
          </Item>
          <Item>
            The carbon monoxide series DEQ began publishing is not analysed here. Its
            averaging period is unresolved: a standing note recorded the sensor series as
            an 8-hour average against a 1-hour regulatory monitor, while DEQ&apos;s own
            table is captioned as hourly and places the sensor rows beside that same
            hourly monitor. Both cannot be right, and until the agency confirms which,
            the sensor rows are not described as hourly concentrations and are not
            published.
          </Item>
          <Item>
            The Kunak dashboard backfills published hours without notice, so a figure
            computed from one export is not guaranteed to be reproducible from a later
            one. Every input in the freeze records its own export date and data cutoff for
            that reason, and the one regression a backfill moves is reported with both
            values.
          </Item>
          <Item>
            Nine hours that had been missing were backfilled with rows in which every
            pollutant channel reads zero. Those rows are treated as missing. The treatment
            is a judgement about an instrument floor rather than a fact established from
            the data, and it is reported to DEQ as such.
          </Item>
          <Item>
            The network was reconfigured in September 2026: three Loudoun sites went
            offline and three sites joined outside Loudoun County, as determined from
            DEQ&apos;s own site history and recorded in the site key. Those three sites are
            outside this version&apos;s scope and no reading from them is reported.
          </Item>
          <Item>
            The reproduction of DEQ&apos;s Table 4 over each site&apos;s own record is
            partial. The day boundary accounts for most of the offset and zero handling is
            a minor and inconsistent effect, but no single combination reproduces all nine
            rows, and the three retired sites reproduce only under the standard-time
            definition for reasons that remain unexplained. It is reported as a partial
            reproduction and is not described as fully explained.
          </Item>
        </List>
      </Sub>

      <Sub number="7.4" id="limitations-atlas" title="Limits of the atlas itself">
        <P>
          The published knowledge graph is not reproducible from the current pipeline. It
          is served at its committed counts, <N k="inventory.graph.nodes" /> nodes and{" "}
          <N k="inventory.graph.edges" /> edges, and a clean rebuild yields different
          ones. It was repaired in place for an encoding fault rather than regenerated,
          its status is recorded in the module inventory, it is excluded from this
          report&apos;s reproducibility claim, and the fix is on the roadmap. No number in
          this report is derived from it.
        </P>
        <P>
          Pathway and gene-environment relationships in the atlas are often inferred from
          correlative or indirect evidence, and evidence from cell or animal models does
          not guarantee relevance in human tissue. The strength and confidence scores
          reflect the quality of the evidence, not certainty about what brings about what. One link of the published
          mechanism chain carries the inferred class, meaning the atlas holds no direct
          evidence for it, and three of the five classes are assigned by the figure
          definition rather than read from an atlas record.
        </P>
        <P>
          The community module is modelled at county resolution: one county boundary and
          one county-level value per exposure layer, with no sub-county variation drawn
          and none synthesised. Its model is trained on national data and is not validated
          outside that distribution.
        </P>
      </Sub>

      <Sub number="7.5" id="limitations-inference" title="Limits of inference">
        <P>
          Aggregated exposure paired with aggregated prevalence cannot establish that the
          exposed people within an area are the affected people. That is the ecological
          fallacy, and it is the reason this report publishes no association between
          tract-level exposure and tract-level prevalence, and the reason the atlas
          publishes none either. Where the atlas shows an exposure layer and a health
          measure for the same region, both are area aggregates and neither speaks to any
          individual in it.
        </P>
        <P>
          The genetic evidence the atlas carries was measured overwhelmingly in
          European-ancestry samples, as the preceding section quantifies for asthma. Effect
          estimates and variant-disease associations from that base transfer unevenly to
          other groups, and the atlas reports ancestry composition and discovery-record
          gaps rather than implying the estimates are population-neutral.
        </P>
        <P>
          Nothing in this report or on the atlas is medical advice, and none of it is a
          diagnostic instrument. Every figure is a population or site aggregate. There is
          no statement anywhere about any individual, and the atlas holds no personal
          data of any kind from which such a statement could be made.
        </P>
      </Sub>
    </Section>
  );
}
