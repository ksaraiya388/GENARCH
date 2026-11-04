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
          The two data sources do not agree on what an hour is, and reconciling them is
          the single most consequential methodological step in this report. Sensor
          timestamps from the Kunak dashboard are hour-ending and adjusted for daylight
          saving. The regulatory files are hour-beginning and always in Eastern
          Standard Time. Before any comparison or any daily average, sensor timestamps
          are shifted back by one hour before the spring transition and by two hours
          after it, and both the raw and the normalised stamp are kept, with the shift
          recorded per row. Pairing on unnormalised stamps degrades every regression
          substantially and is wrong.
        </P>
        <P>
          Daily averages are binned in local standard time, which is the convention the
          federal regulation uses for the 24-hour standard{" "}
          <Cite id="cfr50appn" />, and that is the pipeline default. DEQ&apos;s published
          sensor tables bin by local clock time instead. Through the winter the two
          agree; during daylight saving they differ by one hour, which moves the last
          hour of each local day into the previous day. GENARCH does not change its
          binning to match. The finding is that the two conventions diverge, not that
          either is wrong, and because the divergence is material for one statistic and
          immaterial for the others, every comparison in this report against a DEQ
          published table carries both column sets so a reader can check either.
        </P>
      </Sub>

      <Sub number="3.3" id="methods-completeness" title="Completeness and readings of zero">
        <P>
          A 24-hour average requires 18 of 24 valid hours, which is DEQ&apos;s own
          threshold, confirmed by agency staff. A day below that threshold is absent
          rather than estimated, and no gap is interpolated or rendered as a zero
          anywhere. On the regulatory side a reading is excluded when its value is
          absent, when a null code is present, or when its flag string contains the
          less-than character that marks the logger invalid. A letter code alone never
          excludes a reading: the letter identifies the event and the comparator decides
          validity. Flags are compared case-sensitively, because the published table
          pairs different meanings on the same letter in different cases.
        </P>
        <P>
          Sensor rows in which every pollutant channel reads zero are treated as
          missing. A zero on one channel while the others carry values is read as
          per-channel floor clamping rather than an outage, and those readings are
          excluded as a fault mode throughout the pipeline and throughout the site. One
          documented exception exists: the NO2 regression for the second collocated
          unit retains them, because DEQ confirmed in correspondence of 2026-08-19 that
          the agency retains them in that one fit and supplied the paired data it runs
          on. The exception is scoped to that single comparison and is not extended,
          because extending it moves two coefficients that currently agree with DEQ
          back outside tolerance.
        </P>
      </Sub>

      <Sub number="3.4" id="methods-collocation" title="Collocation method">
        <P>
          One sensor sits beside the regulatory monitor, and comparing the two is what
          DEQ publishes weekly as the network&apos;s own validation. The reproduction
          pairs readings on the normalised Eastern Standard Time stamp, applies the
          exclusion flags on both sides, assigns readings to collocation periods by
          unit from the occupancy table, and fits ordinary least squares with the sensor
          on the horizontal axis and the regulatory monitor on the vertical, which is
          DEQ&apos;s own plotting convention. Every fit stops at the{" "}
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
          qualifier code identifies the episode in the regulatory record. Hours whose
          local standard time day falls in that window are excluded from the cross-site
          correlation, because a regional smoke plume raises every sensor at once and
          would inflate every pairwise correlation toward one without telling a reader
          anything about the network. The window is not excluded from the percentile
          work, where its presence inside a short record is the finding rather than a
          nuisance.
        </P>
      </Sub>

      <Sub number="3.6" id="methods-chain" title="Grading the mechanism chain">
        <P>
          The published mechanism chain has <N k="chain.steps" /> links. Each link
          carries an evidence class, and the classes do not all come from the same
          place. Two are read from atlas records: the first link&apos;s class comes from
          the exposure link on the gene record, and the last link&apos;s class comes from
          the disease link on the same record. The middle three, steps two, three and
          four, are classes assigned by the figure definition itself rather than read from
          any atlas record, and they are marked as such in the evidence table, in the
          generated provenance for each key and everywhere the chain is described in
          this report. One link carries the inferred class, which means the atlas holds
          no direct evidence for it.
        </P>
        <P>
          Stating this is not a formality. A reader looking at a five-step chain with an
          evidence class beside every step will reasonably assume all five classes were
          curated the same way, and three of them were not: they are the figure
          author&apos;s classification of textbook intermediate steps. Reporting the
          chain without that distinction would overstate how much of it the atlas
          actually grades.
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
          Two deliberate limits are worth stating. Nothing inside a citation is ever
          linted, because a published title is quoted material and enforcing a lexicon
          on it would pressure an author to falsify it. And a pre-existing baseline
          records the violations the lint already knew about, so the gate fails on a new
          violation rather than on the backlog; report prose is not eligible for that
          baseline, so a violation introduced here has to be rewritten.
        </P>
      </Sub>

      <Sub number="3.8" id="methods-repro" title="Reproducibility">
        <P>
          The commands, the commit, the environment and the input hashes are in Appendix
          A. In outline: the generator reads the freeze, verifies every input hash,
          recomputes every number, writes the keyed values, the tables and the figures,
          and fails rather than adjusting anything if a value computed on an original
          window no longer reproduces. Report prose cites the keyed values and types no
          number of its own, so prose and data cannot disagree.
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
