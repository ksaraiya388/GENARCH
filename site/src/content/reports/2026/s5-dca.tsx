import {
  Callout,
  Cite,
  List,
  Item,
  N,
  P,
  ReportFigure,
  ReportTable,
  Section,
  Sub,
} from "./bound";

export function DataCenterAlley() {
  return (
    <Section number="5" id="data-center-alley" title="The monitored corridor: reprocessing DEQ's published data">
      <P>
        Virginia DEQ operates a low-cost sensor network across the data center corridor
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
          The network grew and shrank over the record. Across 2026 it covered{" "}
          <N k="network.sites_total" /> sites, of which{" "}
          <N k="network.sites_active_at_cutoff" /> were collecting at DEQ&apos;s{" "}
          <N k="deq.edition_cutoff" /> edition cutoff. Three Loudoun sites retired
          before that cutoff and three sites outside Loudoun joined after it. The
          records differ enormously in length: site DC-01 carries{" "}
          <N k="network.record_days.DC-01" /> complete days and site DC-06 carries{" "}
          <N k="network.record_days.DC-06" />, which is the fact behind the record-length
          result below. The window in which all six of the then-live sensors were
          collecting together runs from <N k="network.common_window.start" /> to{" "}
          <N k="network.common_window.end" />.
        </P>
        <P>
          Sensors are identified throughout by neutral site code. Four of the nine
          Loudoun sites are hosted at schools, and setting a school name beside a
          concentration figure invites an inference about children at that school which
          none of these data support. The site key, printed with the coverage figure below, maps each code to the name DEQ
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
          site. Recomputing them from the source tables gives coefficients that agree
          with DEQ&apos;s within <N k="colloc.tolerance_coefficient" /> on slope and
          intercept and <N k="colloc.tolerance_r2" /> on R-squared. Drift outside that
          tolerance fails the build, so the agreement is asserted continuously rather
          than claimed once. This is classified as validated at DEQ&apos;s published
          precision, and the qualification matters: DEQ publishes these coefficients to
          two significant figures, so the claim is that the recomputed values round to
          DEQ&apos;s at DEQ&apos;s own precision. Agreement to three decimals is not
          verifiable against the source and is not claimed here.
        </P>
        <P>
          The four are not four instances of one thing. Two of them run over a closed
          window, so their published values cannot move in any later edition. The other
          two remain open and are refit every week as more data arrive, which means
          their published coefficients move in every edition, and any comparison against
          one of them has to align cutoffs before it means anything. That is the right
          way to describe the set, and it is the reason this report does not report how
          many of the four currently agree.
        </P>
        <ReportFigure id="F02" />
        <P>
          One of the four does not round to DEQ&apos;s printed value. The NO2 fit on the
          first unit gives an R-squared of{" "}
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
          rather than resolved. Its published coefficients are a correction DEQ issued
          on 2026-08-19: the agency traced its earlier figures to axis limits in its
          plotting call that had bounded the model fit as well as the plotted view, and
          refitting on the full data gave the corrected coefficients. The correction is
          in print in DEQ&apos;s own later edition, which is what this report cites for
          the fact of it. That fit is also the single comparison in which readings of
          zero are retained, on DEQ&apos;s confirmation that the agency retains them
          there. Its coefficients move when the dashboard&apos;s backfilled all-zero
          rows are admitted to a zero-retaining fit: the intercept goes from{" "}
          <N k="colloc.apex-05_NO2.gx_intercept" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_gx_intercept" />, the slope from{" "}
          <N k="colloc.apex-05_NO2.gx_slope" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_gx_slope" />, the R-squared from{" "}
          <N k="colloc.apex-05_NO2.gx_r2" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_gx_r2" /> and the paired-hour count from{" "}
          <N k="colloc.apex-05_NO2.n_pairs" /> to{" "}
          <N k="colloc.apex-05_NO2.backfill_n_pairs" />, on the one backfilled hour that
          only that fit readmits. The other three regressions are unchanged. The values
          reported here are computed from the original analysis inputs, which is the
          input set DEQ&apos;s own published coefficients correspond to.
        </P>
        <Callout title="After the freeze">
          <P>
            The collocation window at site DC-01 closed on 2026-10-22, when the unit
            there was replaced, as DEQ&apos;s <Cite id="deq2026oct30" /> edition records.
            That is after the 2026-10-18 freeze this report is computed at, so it changes
            no value and no framing above; it is stated once, here, so a reader comparing
            this report against a current DEQ edition knows why the window ends.
          </P>
        </Callout>
      </Sub>

      <Sub number="5.3" id="dca-daily" title="Reconciling the daily averages">
        <P>
          Recomputing 24-hour means for the regulatory monitor from the hourly file, and
          comparing them against the daily-average file DEQ publishes, gives agreement
          on <N k="daily.n_match" /> of <N k="daily.n_days" /> comparable days, with a
          mean absolute difference of <N k="daily.mean_abs_diff" /> µg/m³ and a maximum
          of <N k="daily.max_abs_diff" /> µg/m³, over{" "}
          <N k="daily.n_days" fmt="window" />. Comparable has a precise meaning here: the
          published day has to survive DEQ&apos;s null-code and logger-invalid
          exclusions, and the recomputed day has to clear 18 of 24 valid hours. DEQ
          truncates published values to one decimal rather than rounding them, and the
          comparison truncates the same way.
        </P>
        <P>
          The single day that differs is 2026-03-10, recomputed{" "}
          <N k="daily.max_abs_diff" /> µg/m³ below the published one at 23 valid hours. An earlier figure for
          this reconciliation covered a wider set of days by applying no completeness
          threshold and reading the published file unfiltered; the threshold is DEQ&apos;s
          own, so that figure is superseded and the narrower comparison is what is
          reported.
        </P>
        <ReportFigure id="F03" tableId="T04s_daily_summary" />
      </Sub>

      <Sub number="5.4" id="dca-record-length" title="Record length moves a percentile">
        <P>
          Table 4 of DEQ&apos;s <Cite id="deq2026aug07" /> edition identifies one sensor,
          site DC-06 in the site key, as the only sensor in the network whose daily
          PM2.5 98th percentile exceeded <N k="naaqs.daily_standard" /> µg/m³. Restricted
          to the window when all six then-live sensors were collecting,{" "}
          <N k="p98.common.n_above_35" /> of the six exceed that level under the local
          standard time day definition and the same number under local clock time, and
          site DC-06 ranks <N k="p98.common.rank.DC-06" /> under both. Its record was{" "}
          <N k="network.record_days.DC-06" /> complete days, falling entirely in high
          summer and including the wildfire smoke weekend, against{" "}
          <N k="network.record_days.DC-04" /> to <N k="network.record_days.DC-01" /> days
          for the other five. Neither DEQ&apos;s figure nor the figure here is comparable
          to the national standards. DEQ&apos;s table reported each sensor&apos;s value
          over that sensor&apos;s own record, and every figure in the series is
          DEQ&apos;s own; the comparison between sensors did not hold because the records
          differed in length and in season, and the resolution came from DEQ&apos;s own
          lengthening record, with the agency&apos;s{" "}
          <Cite id="deq2026oct09" /> edition listing no site above that level. This is a
          statement about record length, not a claim that DEQ&apos;s figures were wrong
          or that any site is polluted.
        </P>
        <P>
          Moving from standard-time to clock-time binning raises the percentile at every
          site, by between <N k="p98.common_clock.rise_min" /> and{" "}
          <N k="p98.common_clock.rise_max" /> µg/m³ on the common window, and reorders
          nothing. Counts and values use whole days through 2026-08-07; DEQ built the
          edition from data through <N k="deq.edition_cutoff" />, and the table carries
          that cutoff as its own column so both day sets are visible. Under DEQ&apos;s
          cutoff the record lengths shorten by a day at several sites and the result is
          unchanged: the same number of sites sit above the level and site DC-06 still
          ranks fourth under both day definitions.
        </P>
        <P>
          Over each site&apos;s own record the reproduction of that table is partial, and
          it stays described as partial. The day boundary accounts for most of a one to
          two microgram offset: local clock time with zero readings treated as missing
          brings five of the six live sites within{" "}
          <N k="p98.reproduction_tolerance" /> µg/m³ of DEQ&apos;s published value, leaving
          one at a fifth of a microgram. Zero handling is a secondary effect and is
          inconsistent in direction, closing one site and opening another. The three
          sites whose record ended before that edition reproduce only under standard-time
          binning, although their record-day counts and end dates agree with DEQ under
          both definitions, and no end date brings them within tolerance under clock
          days. That difference is unexplained. No single combination of day definition
          and zero handling reproduces all nine rows, which is why this is reported as a
          partial reproduction and never as fully explained.
        </P>
        <ReportTable id="T06" />
        <ReportFigure id="F04" />
      </Sub>

      <Sub number="5.5" id="dca-correlation" title="Cross-site correlation">
        <P>
          Hourly PM2.5 correlates between <N k="corr.min" /> and <N k="corr.max" />{" "}
          across all fifteen pairs of the six sensors, over{" "}
          <N k="corr.n_hours" /> hours outside the smoke window, with zero readings
          treated as missing. This is descriptive and nothing more. High spatial
          correlation does not establish that local sources contribute nothing: the
          network may sit largely upwind, and a local increment can be masked by a
          dominant regional signal.
        </P>
        <ReportFigure id="F05" />
      </Sub>

      <Sub number="5.6" id="dca-not-supported" title="Hypotheses tested and not supported">
        <P>
          Four readings of this record were tested and are not supported by it. They are
          listed because a reader may arrive with any of them, and because the reason
          each one fails is more informative than the result.
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
            discriminates between sources. The median ratio is near two, but at low
            concentrations the ratio becomes unstable and reaches values up to ten on
            hours where every reading is small, so below roughly thirty micrograms it
            carries no information about origin.
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
          exacerbation{" "}
          <Cite id="li2017" />
          <Cite id="shadie2014" />
          <Cite id="cayrol2018" />. The brief carrying it holds{" "}
          <N k="chain.reference_count" /> references, and the atlas grades the exposure
          link on the gene record as literature evidence and the disease link as
          association evidence from genome-wide studies{" "}
          <Cite id="alvarez2021" />
          <Cite id="islam2014" />.
        </P>
        <P>
          Steps two, three and four are classes assigned by the figure definition rather
          than read from any atlas record, and one of them carries the inferred class,
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
          it. The Piedmont Environmental Council has published a health-impact assessment
          for data center emissions in Virginia built on the EPA&apos;s screening tool for
          emissions co-benefits{" "}
          <Cite id="pec2026cobra" />. That work models emissions and their modelled
          consequences; this report reprocesses measurements and reports where a
          recomputation of published statistics agrees with them. The two are not
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
