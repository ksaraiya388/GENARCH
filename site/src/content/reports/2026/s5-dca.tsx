import {
  Callout,
  Cite,
  EditionDate,
  List,
  Item,
  N,
  P,
  ReportFigure,
  ReportTable,
  Section,
  Sub,
  TableRef,
} from "./bound";

export function DataCenterAlley() {
  return (
    <Section number="5" id="data-center-alley" title="The monitored corridor: reprocessing DEQ's published data">
      <P>
        Virginia DEQ operates a low-cost sensor network across the data centre corridor
        in eastern Loudoun County and publishes a weekly analysis of it, alongside a
        regulatory monitor at one of the sensor sites. This section recomputes the
        statistics that analysis publishes, from the source files, and reports where the
        recomputation agrees and where it does not. It describes co-location between a
        monitored corridor and a set of readings, and biological mechanism elsewhere in
        the atlas. It establishes nothing about what produced any reading and nothing
        about anyone&apos;s health.
      </P>

      <Sub number="5.1" id="dca-network" title="The network and the site key">
        <P>
          The network grew and shrank over the record. Through the{" "}
          <N k="freeze.cutoff" /> data cutoff it covered <N k="network.sites_total" />{" "}
          sites, of which <N k="network.sites_active_at_deq_cutoff" /> were collecting at
          DEQ&apos;s <N k="deq.edition_cutoff" /> edition cutoff. Of the Loudoun sites,{" "}
          <N k="network.sites_retired_before_deq_cutoff" /> retired before that cutoff,
          and <N k="network.sites_outside_scope" /> sites outside Loudoun joined after it.
          The records differ widely in length: on whole days through{" "}
          <N k="network.common_window.end" />, site DC-01 carries{" "}
          <N k="network.record_days.DC-01" /> complete days and site DC-06 carries{" "}
          <N k="network.record_days.DC-06" /> (<N k="network.record_days.DC-01.deq_cutoff" />{" "}
          and <N k="network.record_days.DC-06.deq_cutoff" /> under DEQ&apos;s edition
          cutoff), which is the fact behind the record-length result below. The window in
          which all <N k="p98.common.n_sites" /> of the then-live sensors were collecting
          together runs from <N k="network.common_window.start" /> to{" "}
          <N k="network.common_window.end" />.
        </P>
        <P>
          Sensors are identified throughout by neutral site code. Several of the{" "}
          <N k="network.loudoun_sites" /> Loudoun sites are hosted at schools, and setting
          a school name beside a concentration figure invites an inference about children
          at that school which none of these data support. The site key, printed with the coverage figure below, maps each code to the name DEQ
          publishes for that location. It carries no reading value of any kind, by
          design, so the reproduction against DEQ&apos;s documents stays checkable
          without the two ever appearing in one row.
        </P>
        <ReportFigure id="F01" />
      </Sub>

      <Sub number="5.2" id="dca-collocation" title="Reproducing the collocation regressions">
        <P>
          DEQ publishes four regressions of the collocated sensor against the regulatory
          monitor, two per pollutant, one for each of the two units that occupied the
          site. Recomputing them from the source tables, on hours through DEQ&apos;s{" "}
          <N k="deq.edition_cutoff" /> edition cutoff, gives coefficients that agree with
          DEQ&apos;s within <N k="colloc.tolerance_coefficient" /> on slope and intercept
          and <N k="colloc.tolerance_r2" /> on R-squared. Drift outside that tolerance
          fails the build, so the agreement is asserted continuously rather than claimed
          once. This is classified as validated at DEQ&apos;s published precision, and the
          qualification matters: DEQ publishes these coefficients to{" "}
          <N k="colloc.deq_significant_figures" /> significant figures, so the claim is
          that the recomputed values round to DEQ&apos;s at DEQ&apos;s own precision.
          Agreement beyond that precision is not verifiable against the source and is not
          claimed here.
        </P>
        <P>
          The four regressions differ in how they behave from edition to edition. The
          first unit&apos;s two run over a closed window, so their published values cannot
          move in any later edition. The second unit&apos;s two were open at the freeze
          and were refit every week as more data arrived, so their published coefficients
          moved in every edition, and any comparison against one of them has to align
          cutoffs before it means anything. The set is described in those terms rather
          than as a count of how many currently agree.
        </P>
        <ReportFigure id="F02" />
        <P>
          The NO2 fit on the first unit gives an R-squared of{" "}
          <N k="colloc.apex-14_NO2.gx_r2" /> against DEQ&apos;s published{" "}
          <N k="colloc.apex-14_NO2.deq_r2" />, a difference of{" "}
          <N k="colloc.apex-14_NO2.diff_r2" /> that sits inside tolerance but rounds to
          a different second decimal. Leave-one-out resampling on that fit moves the
          R-squared across a span wide enough to cross that boundary, and removing any of
          several single observations pushes it over. The intercept and slope on that fit are
          stable and do reproduce. The R-squared sits close enough to a boundary that a
          small methodological difference flips it, which is why it is reported as near
          rather than as a reproduction.
        </P>
        <P>
          The NO2 fit on the second unit carries two complications that are recorded
          rather than resolved. Its DEQ coefficients, marked † in{" "}
          <TableRef id="T03" />, are those DEQ staff supplied on{" "}
          <N k="deq.correspondence.collocation_correction" /> for the same window as the
          other three <Cite id="deqcorrespondence" />, not values printed in an edition.
          DEQ&apos;s own printed correction, in its <EditionDate id="deq2026aug21" />{" "}
          edition <Cite id="deq2026aug21" />, is y ={" "}
          <N k="deq.aug21.apex-05_NO2.intercept" /> +{" "}
          <N k="deq.aug21.apex-05_NO2.slope" />x, R-squared{" "}
          <N k="deq.aug21.apex-05_NO2.r2" />, over a longer window than the regulatory
          record this report holds, so it is not compared. That fit is also the single
          comparison in which readings of zero are retained, on DEQ&apos;s confirmation
          that the agency retains them there. Its coefficients move when the
          dashboard&apos;s backfilled all-zero
          rows are admitted to a zero-retaining fit: the intercept goes from{" "}
          <N k="colloc.apex-05_NO2.gx_intercept" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_gx_intercept" />, the slope from{" "}
          <N k="colloc.apex-05_NO2.gx_slope" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_gx_slope" />, the R-squared from{" "}
          <N k="colloc.apex-05_NO2.gx_r2" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_gx_r2" /> and the paired-hour count from{" "}
          <N k="colloc.apex-05_NO2.n_pairs" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_n_pairs" />, on the one backfilled hour that
          only that fit readmits. The other regressions are unchanged. The values reported
          here are computed from the original analysis inputs, which is the input set
          DEQ&apos;s coefficients correspond to.
        </P>
        <Callout title="After the freeze">
          <P>
            DEQ&apos;s <EditionDate id="deq2026oct30" /> edition records in its section 2{" "}
            <Cite id="deq2026oct30" /> that on{" "}
            <N k="deq.postfreeze.collocated_unit_swap" /> the collocated unit at site
            DC-01 was replaced, data collection at site DC-02 ended, and two sensors were
            placed at new sites in Prince William County. DEQ&apos;s{" "}
            <EditionDate id="deq2026nov06" /> edition records in its section 2{" "}
            <Cite id="deq2026nov06" /> that sensor data collection at site DC-01 ended on{" "}
            <N k="deq.postfreeze.dc01_collection_end" /> and the unit moved to a new
            Loudoun County site, which ended the collocated comparison; DEQ&apos;s
            regulatory monitor at the site continues. The same edition records no end of
            collection at site DC-04, the other Loudoun site <TableRef id="T02" /> shows as
            open at the freeze.
          </P>
          <P>
            All of this is after the <N k="freeze.taken_at" /> freeze this report is
            computed at, so it changes no value and no framing above. It is stated once,
            here, so a reader comparing this report against a current DEQ edition knows why
            the comparison ends and why the network looks different.
          </P>
        </Callout>
      </Sub>

      <Sub number="5.3" id="dca-daily" title="Reconciling the daily averages">
        <P>
          Recomputing 24-hour means for the regulatory monitor from the hourly file, and
          comparing them against the daily-average file DEQ publishes, gives agreement
          on <N k="daily.n_match" /> of <N k="daily.n_days" /> comparable days, with a
          mean absolute difference of <N k="daily.mean_abs_diff" /> µg/m³ and a maximum
          of <N k="daily.max_abs_diff" digits={1} /> µg/m³, over{" "}
          <N k="daily.n_days" fmt="window" />. Comparable has a precise meaning here: the
          published day has to survive DEQ&apos;s null-code and logger-invalid
          exclusions, and the recomputed day has to clear{" "}
          <N k="completeness.valid_hours" /> of <N k="completeness.hours_per_day" /> valid
          hours. DEQ truncates published values to one decimal rather than rounding them,
          and the comparison truncates the same way. The note to <TableRef id="T04s" />{" "}
          gives the reason each of the other days in the window is not comparable.
        </P>
        <P>
          The single day that differs is <N k="daily.mismatch_date" />, recomputed{" "}
          <N k="daily.max_abs_diff" digits={1} /> µg/m³ below the published one at{" "}
          <N k="daily.mismatch_valid_hours" /> valid hours. An earlier figure for
          this reconciliation covered a wider set of days by applying no completeness
          threshold and reading the published file unfiltered; the threshold is DEQ&apos;s
          own, so that figure is superseded and the narrower comparison is what is
          reported.
        </P>
        <ReportFigure id="F03" tableId="T04s_daily_summary" />
      </Sub>

      <Sub number="5.4" id="dca-record-length" title="Record length and one smoke weekend move a percentile">
        <P>
          Table 4 of DEQ&apos;s <EditionDate id="deq2026aug07" /> edition{" "}
          <Cite id="deq2026aug07" /> identifies one sensor, site DC-06 in the site key, as
          the only sensor in the network whose daily PM2.5 98th percentile exceeded{" "}
          <N k="naaqs.daily_standard" /> µg/m³. Restricted to the window when all six
          then-live sensors were collecting, on whole days through{" "}
          <N k="network.common_window.end" /> (DEQ&apos;s edition cutoff{" "}
          <N k="deq.edition_cutoff" />), <N k="p98.common.n_above_35" fmt="count" /> of
          the <N k="p98.common.n_sites" /> exceed that level under the local standard time
          day definition and <N k="p98.common_clock.n_above_35" fmt="count" /> under local
          clock time, and site DC-06 ranks{" "}
          <N k="p98.common.rank.DC-06" fmt="ordinal" /> under both. Its record was{" "}
          <N k="network.record_days.DC-06" /> complete days, falling entirely in high
          summer and including the wildfire smoke weekend, against{" "}
          <N k="network.record_days.DC-04" /> to <N k="network.record_days.DC-01" /> days
          for the other five. Neither DEQ&apos;s figure nor the figure here is comparable
          to the national standards. DEQ&apos;s table reported each sensor&apos;s value
          over that sensor&apos;s own record, and every figure in the series is
          DEQ&apos;s own; the comparison between sensors did not hold because the records
          differed in length, in season and in how much weight the smoke weekend carried
          in each, and the resolution came from DEQ&apos;s own lengthening record, with the
          agency&apos;s <EditionDate id="deq2026oct09" /> edition{" "}
          <Cite id="deq2026oct09" /> listing no site above that level. This is a statement
          about record length and one smoke weekend, not a claim that DEQ&apos;s figures
          were wrong or that any site is polluted.
        </P>
        <P>
          The smoke weekend accounts for that count. With the hours of the smoke window
          excluded (section 3.5), <N k="p98.common_exsmoke.n_above_35" fmt="count" /> of
          the sites has a common-window 98th percentile above{" "}
          <N k="naaqs.daily_standard" /> µg/m³ under local standard time days and{" "}
          <N k="p98.common_clock_exsmoke.n_above_35" fmt="count" /> under local clock
          time days; under local standard time the values run from{" "}
          <N k="p98.common_exsmoke.min" /> to <N k="p98.common_exsmoke.max" /> µg/m³. Site
          DC-06 ranks <N k="p98.common_exsmoke.rank.DC-06" fmt="ordinal" /> with the window
          excluded, as it does with it included, so its position among the six does not
          depend on the smoke days. Whether any site is above the level does. A 98th
          percentile over a record this short is set by its highest days, and in this
          window those are smoke days at every site: at{" "}
          <N k="p98.common.sites_set_by_smoke_days" /> of the{" "}
          <N k="p98.common.n_sites" /> under local standard time and{" "}
          <N k="p98.common_clock.sites_set_by_smoke_days" /> under local clock time, both
          days the percentile is read from fall in the window. Whether those days qualify
          as an exceptional event is a determination that rests with EPA and has not been
          made.
        </P>
        <P>
          With the smoke window included, moving from standard-time to clock-time binning
          raises the percentile at every site, by between{" "}
          <N k="p98.common_clock.rise_min" /> and <N k="p98.common_clock.rise_max" />{" "}
          µg/m³ on the common window, and reorders nothing. With the window excluded the
          two day definitions differ by at most{" "}
          <N k="p98.common_clock_exsmoke.max_abs_diff" /> µg/m³ at any site, in either
          direction, and sites DC-04 and DC-08 exchange second and third place; their
          values differ by <N k="p98.common_exsmoke.diff.DC-04_DC-08" /> µg/m³ under
          standard time. Counts and values use whole days through{" "}
          <N k="network.common_window.end" />; DEQ built the edition from data through{" "}
          <N k="deq.edition_cutoff" />, and the table carries that cutoff as its own column
          so both day sets are visible. Under DEQ&apos;s cutoff the record lengths shorten
          by a day at several sites and the result is unchanged: the same number of sites
          sit above the level, and site DC-06 still ranks{" "}
          <N k="p98.common.rank.DC-06.deq_cutoff" fmt="ordinal" /> under local standard
          time days and <N k="p98.common_clock.rank.DC-06.deq_cutoff" fmt="ordinal" />{" "}
          under local clock time days.
        </P>
        <P>
          Over each site&apos;s own record the reproduction of that table is partial, and
          it stays described as partial. Under local standard time days with zero readings
          treated as missing, the live sites sit between{" "}
          <N k="p98.full.lst_offset_live.min_abs" /> and{" "}
          <N k="p98.full.lst_offset_live.max_abs" /> µg/m³ from DEQ&apos;s published value,
          and the day boundary accounts for most of that offset: local clock time with zero
          readings treated as missing brings{" "}
          <N k="p98.full.clock_zero_missing.n_within_live" /> of the{" "}
          <N k="network.sites_active_at_deq_cutoff" /> live sites within{" "}
          <N k="p98.reproduction_tolerance" /> µg/m³ of DEQ&apos;s value, leaving site
          DC-08 at <N k="p98.full.DC-08.diff_clock_zero_missing" /> µg/m³. Zero handling is
          a secondary effect and is inconsistent in direction: keeping zero readings closes{" "}
          <N k="p98.full.zero_kept.n_closed" /> site and opens{" "}
          <N k="p98.full.zero_kept.n_opened" />. The{" "}
          <N k="network.sites_retired_before_deq_cutoff" /> sites whose record ended before
          that edition reproduce only under standard-time binning, although their
          record-day counts and end dates agree with DEQ under both definitions, and no end
          date brings them within tolerance under clock days. That difference is
          unexplained. No single combination of day definition and zero handling reproduces
          all <N k="p98.full.n_sites" /> rows, which is why this is reported as a partial
          reproduction and never as fully explained. Site DC-06&apos;s own record lies
          wholly inside the common window, and its own-record 98th percentile under local
          standard time is <N k="p98.full.DC-06.lst_zero_missing" /> µg/m³ with the smoke
          window included and <N k="p98.full.DC-06.lst_zero_missing_exsmoke" /> µg/m³ with
          it excluded.
        </P>
        <ReportTable id="T06" />
        <ReportFigure id="F04" />
      </Sub>

      <Sub number="5.5" id="dca-correlation" title="Cross-site correlation">
        <P>
          Hourly PM2.5 correlates between <N k="corr.min" /> and <N k="corr.max" />{" "}
          across all <N k="corr.n_pairs" /> pairs of the <N k="p98.common.n_sites" />{" "}
          sensors, each pair over <N k="corr.pair_hours_min" /> to{" "}
          <N k="corr.pair_hours_max" /> overlapping hours (<N k="corr.n_hours" /> distinct
          hours in all), from the original analysis inputs through{" "}
          <N k="freeze.original_cutoff_date" />, with the smoke window excluded and zero
          readings treated as missing. With the smoke window included, the same pairs
          correlate between <N k="corr.with_smoke.min" /> and{" "}
          <N k="corr.with_smoke.max" />. It is descriptive. High spatial
          correlation does not establish that local sources contribute nothing: the
          network may sit largely upwind, and a local increment can be masked by a
          dominant regional signal.
        </P>
        <ReportFigure id="F05" />
      </Sub>

      <Sub number="5.6" id="dca-not-supported" title="Hypotheses tested and not supported">
        <P>
          Four readings of this record were examined in the August analysis and are not
          supported by it. They are listed because a reader may arrive with any of them,
          and because the reason each one fails is more informative than the result. No
          figure from that examination is reported here, because none of it is
          reproduced by this report&apos;s generator.
        </P>
        <List>
          <Item>
            That the sensor under-reported during the smoke episode. Both the sensor and
            the regulatory monitor are optical instruments and neither is gravimetric, so
            the comparison cannot separate a sensor artifact from a real difference in
            what the two instruments saw.
          </Item>
          <Item>
            That no localised elevation exists anywhere in the record. The cross-site
            correlation is consistent with a dominant regional signal, which is not the
            same as the absence of a local one, and this record cannot distinguish the
            two.
          </Item>
          <Item>
            That a nocturnal inversion pattern holds across the network. The diurnal
            shapes differ by site, so there is no single network-wide pattern to report.
          </Item>
          <Item>
            That the ratio between the highest and lowest simultaneous readings
            discriminates between sources. At low concentrations the ratio becomes
            unstable, because every reading is small and a small difference makes a large
            ratio, so on those hours it carries no information about origin.
          </Item>
        </List>
        <P>
          A fifth reading should also be set aside: that comparing a sensor against a
          reference monitor is itself novel. DEQ publishes that comparison every week.
          What this section adds is an independent recomputation of it from the source
          files, with the method and the inputs stated.
        </P>
      </Sub>

      <Sub number="5.7" id="dca-mechanism" title="Mechanistic context">
        <P>
          The atlas carries a published mechanism chain for fine particulate matter and
          asthma, in <N k="chain.steps" /> links from particulate exposure through
          bronchial epithelial injury, release of the cytokine IL-33, engagement of its
          receptor on innate lymphoid cells, and type 2 inflammation, to asthma
          exacerbation <Cite id="song2017" />
          <Cite id="shadie2014" />
          <Cite id="delafuente2015" />. Of these, <Cite id="song2017" /> is a study in
          cultured human airway cells and <Cite id="shadie2014" /> a study in mice: cell
          and animal evidence, which does not establish that the steps operate in people.
          The brief carrying the chain holds <N k="chain.reference_count" /> references{" "}
          <Cite id="song2017" />
          <Cite id="shadie2014" />
          <Cite id="aneas2021" />
          <Cite id="macintyre2014" />
          <Cite id="delafuente2015" />, and the atlas grades the exposure link on the gene
          record as literature evidence <Cite id="shadie2014" /> and the disease link as
          association evidence from genome-wide studies <Cite id="aneas2021" />.
        </P>
        <P>
          The middle links&apos; classes are assigned by the figure definition rather than
          read from any atlas record, and <N k="chain.inferred_steps" /> of them carries
          the inferred class,
          meaning the atlas holds no direct evidence for it. The chain states a
          mechanism: it describes a sequence that is understood to operate in airway
          tissue, link by link, each link carrying its own evidence class. No link in it
          asserts that one step brings about the next in any population, and nothing in
          this report connects the corridor, its facilities or any reading to a health
          outcome in Loudoun County.
        </P>
        <ReportTable id="T09" />
      </Sub>

      <Sub number="5.8" id="dca-related" title="Relation to existing work">
        <P>
          Two bodies of work sit next to this one and answer different questions. DEQ
          publishes a weekly analysis of the same network, which is the source of every
          published coefficient and percentile this section recomputes; it is the
          authority here, and this report is a check on it rather than an alternative to
          it. An assessment prepared for the Piedmont Environmental Council models the
          permitted emissions of one facility&apos;s on-site power system and their
          estimated consequences, using the EPA&apos;s COBRA screening tool{" "}
          <Cite id="corkdominici2026" />. That work models emissions; this report
          reprocesses measurements and reports where a recomputation of published
          statistics agrees with them. The two are not
          comparable and neither substitutes for the other.
        </P>
        <P>
          To our knowledge, no independent reprocessing of the Project&apos;s sensor data
          has been published.
        </P>
      </Sub>
    </Section>
  );
}
