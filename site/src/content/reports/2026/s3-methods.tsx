import { Callout, Cite, List, Item, N, P, Section, Sub } from "./bound";

export function Methods() {
  return (
    <Section number="3" id="methods" title="Methods">
      <Sub number="3.1" id="methods-pipeline" title="Pipeline stages and validation gates">
        <P>
          The atlas is built by a seven-stage Python pipeline: ingest reads the curated
          source files; normalize standardises identifiers, slugs, evidence types,
          direction and confidence onto fixed enumerations; annotate maps variants to
          genes and attaches tissue and pathway context; score computes evidence
          strength and a confidence tier; emit writes the entity JSON and the knowledge
          graph; validate checks the output; and package builds the static site. The
          site has no runtime: every page is rendered at build time from the emitted
          JSON and served as static HTML.
        </P>
        <P>
          Four gates stand between a change and a published page, and all four are run
          in continuous integration on every push. Schema validation checks every
          record against a strict model that forbids unknown fields. Cross-link
          validation requires every referenced slug to resolve, every citation
          identifier to exist and every graph edge to join two nodes that are present.
          An editorial lint checks every user-visible string against the content
          constraints. An encoding check reads every tracked text file for the
          byte-sequence signatures of double-encoded text and for a stray byte-order
          mark. A fifth gate covers this report specifically: a fresh generator run on
          a different operating system has to reproduce the committed numbers and
          tables byte for byte, and continuous integration fails if it does not.
        </P>
      </Sub>

      <Sub number="3.2" id="methods-timestamps" title="Timestamps and day binning">
        <P>
          The two data sources do not agree on what an hour is, and every comparison in
          this report depends on reconciling them. Sensor timestamps from the Kunak
          dashboard are hour-ending and adjusted for daylight saving. The regulatory files
          are hour-beginning and always in Eastern Standard Time. Before any comparison or
          any daily average, each sensor label is read as America/New_York wall time and
          converted to the hour-beginning Eastern Standard Time hour, and both the raw and
          the converted stamp are kept, with the shift recorded per row. For every hour in
          the frozen record this is the instruction confirmed by agency staff: a shift of{" "}
          <N k="kunak.shift_hours.before_dst" /> hour before the spring transition and{" "}
          <N k="kunak.shift_hours.after_dst" /> hours after it. The record ends before the autumn transition, so
          the hour that transition repeats, which the export cannot order, does not arise
          here. Pairing on unconverted stamps misaligns every pair.
        </P>
        <P>
          Daily averages are binned in local standard time, which is the convention the
          federal regulation uses for the 24-hour standard{" "}
          <Cite id="cfr50appn" />, and that is the pipeline default. DEQ&apos;s published
          sensor tables bin by local clock time instead. Through the winter the two
          agree; during daylight saving they differ by an hour, which moves the last hour
          of each local day into the previous day. GENARCH does not change its binning to
          match. The finding is that the two conventions diverge, not that either is
          wrong, and because the divergence is material for one statistic and immaterial
          for the others, every comparison in this report against a DEQ published table
          carries both column sets so a reader can check either.
        </P>
      </Sub>

      <Sub number="3.3" id="methods-completeness" title="Completeness and readings of zero">
        <P>
          A 24-hour average requires <N k="completeness.valid_hours" /> of{" "}
          <N k="completeness.hours_per_day" /> valid hours, the threshold DEQ applies,
          confirmed by agency staff. A day below
          that threshold is absent rather than estimated, and no gap is interpolated or
          rendered as a zero anywhere. On the regulatory side a reading is excluded when its
          value is absent, when a null code is present, or when its flag string contains
          the less-than character that marks the logger invalid. A letter code alone never
          excludes a reading: the letter identifies the event and the comparator decides
          validity. Flags are compared case-sensitively, because the published table pairs
          different meanings on the same letter in different cases.
        </P>
        <P>
          Sensor rows in which every pollutant channel reads zero are treated as
          missing. A zero on one channel while the others carry values is read as
          per-channel floor clamping rather than an outage, and those readings are
          excluded as a fault mode throughout the pipeline and throughout the site. One
          documented exception exists: the NO2 regression for the second collocated unit
          retains them, because they are retained in that one fit, confirmed by agency
          staff. The exception is scoped to that
          single comparison and is not extended, because extending it moves two
          coefficients that currently agree with DEQ back outside tolerance.
        </P>
      </Sub>

      <Sub number="3.4" id="methods-collocation" title="Collocation method">
        <P>
          One sensor sat beside the regulatory monitor throughout the frozen record, and
          comparing the two is what DEQ publishes weekly as the network&apos;s own
          validation. The reproduction pairs readings on the converted Eastern Standard
          Time stamp, applies the exclusion flags on both sides, assigns readings to
          collocation periods by unit from the occupancy table, and fits ordinary least
          squares with the sensor on the horizontal axis and the regulatory monitor on the
          vertical, the orientation of DEQ&apos;s own collocation plots{" "}
          <Cite id="deq2026oct09" />. Every fit stops at the{" "}
          <N k="deq.edition_cutoff" /> edition cutoff, because the coefficients being
          reproduced were computed over that span and no other. Regulatory exclusions are
          mandatory rather than optional here: unexcluded regulatory rows carry missing
          values behind a null code and produce coefficients that are not numbers.
        </P>
        <Callout>
          <P>
            An alternative exists and is not adopted. Assigning periods strictly by
            date rather than by unit moves two paired NO2 readings across the boundary
            where the units were swapped, and the two selections give R-squared values
            that round differently against DEQ&apos;s published figure. DEQ&apos;s own
            supplied data range supports one choice and DEQ&apos;s own published
            coefficient supports the other. The discrepancy is unresolved and is one
            reason the R-squared for that window is not presented as a clean
            reproduction.
          </P>
        </Callout>
      </Sub>

      <Sub number="3.5" id="methods-smoke" title="The smoke window">
        <P>
          Canadian wildfire smoke reached the area over the weekend of{" "}
          <N k="smoke.window_start" /> to <N k="smoke.window_end" />, and DEQ&apos;s own
          qualifier code identifies the episode in the regulatory record. Whether the
          episode is an exceptional event is a determination for the US Environmental
          Protection Agency, not for DEQ, and it is unresolved, confirmed by agency staff.
          Every descriptive statistic of GENARCH&apos;s
          own is reported both ways, with the window and without it. For the cross-site
          correlation the excluded set is the hours whose local standard time day falls in
          the window, because a regional smoke plume raises every sensor at once and pulls
          every pairwise correlation toward one. For the percentiles and the share of
          site-days below the level of the 24-hour standard, the excluded set is the whole
          days <N k="smoke.window_start" /> to <N k="smoke.window_end" /> under the day
          definition in use, so a local clock time percentile leaves out local clock time
          days. In a short record the window&apos;s presence is part of the finding, which
          is why the percentiles are given with it as well as without it. A statistic that
          reproduces one DEQ publishes is computed as DEQ computes it, over all hours, and
          is reported that way only.
        </P>
      </Sub>

      <Sub number="3.6" id="methods-chain" title="Grading the mechanism chain">
        <P>
          The published mechanism chain has <N k="chain.steps" /> links. Each link
          carries an evidence class, and the classes do not all come from the same
          place. <N k="chain.steps_from_records" /> are read from atlas records: the first
          link&apos;s class comes from the exposure link on the IL33 gene record, and the
          last link&apos;s class comes from the asthma link on the same record. Both are
          classes of gene-level links that the figure attaches to those steps, not
          evidence graded for the step itself. The other{" "}
          <N k="chain.steps_from_figure" />, the middle links, are classes assigned by the
          figure definition itself rather than read from any atlas record, and they are
          marked as such in the evidence table, in the generated provenance for each key
          and everywhere the chain is described in this report. Among them is the class
          functional, which the figure definition uses and no atlas record carries. The
          inferred class, carried by <N k="chain.inferred_steps" /> of the links, means the
          atlas holds no direct evidence for that link.
        </P>
        <P>
          The distinction matters because a reader who sees an evidence class beside every
          step will assume all of them were curated the same way, and most were not: they
          are the figure author&apos;s classification of textbook intermediate steps.
          Reporting the chain without that distinction would overstate how much of it the
          atlas grades.
        </P>
      </Sub>

      <Sub number="3.7" id="methods-editorial" title="Editorial constraints and lint">
        <P>
          The project runs a lexicon lint over every user-visible string on the site and
          in the emitted data, including the captions, alt text and method notes in this
          report&apos;s artifacts. It enforces the content constraints mechanically: no
          framing in which an exposure brings about a population health outcome; no company,
          operator, campus or facility name; no school name within range of a reading
          value or a health term; no individual-level language; no policy position. A
          separate tier covers clinical vocabulary in titles, questions, headings and
          labels, where a term like treatment or diagnosis would describe the atlas
          rather than a disease.
        </P>
        <P>
          Two limits are deliberate. Nothing inside a citation is ever linted, because a
          published title is quoted material and enforcing a lexicon on it would pressure
          an author to falsify it. And a pre-existing baseline records the violations the
          lint already knew about, so the gate fails on a new violation rather than on the
          backlog; report prose is not eligible for that baseline, so a violation
          introduced here has to be rewritten.
        </P>
      </Sub>

      <Sub number="3.8" id="methods-repro" title="Reproducibility">
        <P>
          The commands, the commit, the environment and the input hashes are in Appendix
          A. In outline: the generator reads the freeze, verifies every input hash,
          recomputes every number, writes the keyed values, the tables and the figures,
          and fails rather than adjusting anything if a value computed on an original
          window no longer reproduces. Report prose cites the keyed values and types no
          data value of its own, so prose and data cannot disagree.
        </P>
        <P>
          Two parts of the atlas are outside that claim and are named here rather than
          left to be discovered. The knowledge graph is published at its committed node
          and edge counts, <N k="inventory.graph.nodes" /> and{" "}
          <N k="inventory.graph.edges" />, and a clean rebuild from the current pipeline
          does not reproduce them; the graph is repaired in place, its status is recorded
          with the inventory, and the repair is scheduled. The figures are excluded from
          byte comparison because their bytes depend on the plotting library version and
          on which fonts the host has installed; they are compared between two runs on
          one machine instead, and the values behind them are compared everywhere.
        </P>
        <P>The report&apos;s own gates, run before this version was built:</P>
        <List>
          <Item>Every input hash in the freeze re-verified at generation time.</Item>
          <Item>
            Every result that also exists on its original August window recomputed and
            checked against the original value.
          </Item>
          <Item>
            A fresh generator run on Linux compared byte for byte against the committed
            keyed values, tables and atlas artifacts.
          </Item>
          <Item>
            The editorial lint, the encoding check and the schema validation, all
            passing with no new violation.
          </Item>
        </List>
      </Sub>
    </Section>
  );
}
