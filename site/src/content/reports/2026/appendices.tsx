import {
  Cite,
  EditionDate,
  Glossary,
  Item,
  List,
  N,
  P,
  ReportTable,
  Section,
  Sub,
  Term,
} from "./bound";
import { frontmatter } from "./frontmatter";

export function AppendixA() {
  return (
    <Section number="A" id="appendix-a" title="Reproducibility">
      <Sub number="A.1" id="appendix-a-commands" title="Commands">
        <P>
          Run from the repository root. The first command regenerates every keyed value,
          table and figure this report states. The next four are the gates: schema and
          cross-link validation, the editorial lint, the encoding check and the test
          suite. The last rebuilds the site, which is where the report prose is rendered
          and where a missing key fails the build.
        </P>
        <pre className="report-pre">
          <code>{[
            "python -m pipeline.report --year 2026 \\",
            "    --freeze data/reports/2026/FREEZE.json",
            "python -m pipeline validate",
            "node scripts/check-constraints.mjs",
            "python scripts/check_mojibake.py",
            "python -m pytest tests/",
            "cd site && npm run build",
          ].join("\n")}</code>
        </pre>
      </Sub>

      <Sub number="A.2" id="appendix-a-environment" title="Commit and environment">
        <P>
          The data freeze was taken at commit <N k="freeze.commit" group={false} /> on the
          report branch. That hash is the one recorded when the freeze was taken; a
          history rewrite on <N k="freeze.rewrite_date" /> changed commit identifiers and
          no file content,
          and the same tree is now commit{" "}
          <N k="freeze.commit_rewritten" group={false} />. The atlas half was frozen on{" "}
          <N k="inventory.frozen_at" /> and the ancestry inputs on{" "}
          <N k="ancestry.frozen_at" />. The interpreter is CPython 3.14 with UTF-8 mode
          enabled, and the package set is pinned exactly in the pipeline requirements
          file, because an unpinned numerical library can move a percentile in the last
          decimal. The site is built with Node 20.
        </P>
        <P>
          Continuous integration runs the generator again on a pinned Linux runner and
          compares the keyed values, the tables and the two atlas artifacts against the
          committed ones byte for byte. Figures are excluded from that comparison: their
          bytes depend on the plotting library version and on the host&apos;s installed
          fonts, so they are compared between two runs on one machine instead, and the
          values behind them are compared everywhere.
        </P>
      </Sub>

      <Sub number="A.3" id="appendix-a-inputs" title="Input hashes">
        <P>
          Every DEQ and sensor input the analysis reads, with its origin, its licence, its
          export date, its data cutoff and its full SHA-256:{" "}
          <N k="freeze.n_deq_inputs" /> pinned in the freeze and{" "}
          <N k="freeze.n_inputs_pinned_in_keys" /> pinned by hash in the keys that read it.
          The atlas, ancestry and configuration inputs are pinned by hash in the same freeze
          file. This is the only copy of the table in the
          report: it is a provenance manifest rather than part of an argument, and it
          belongs with the reproducibility instructions above rather than inside the
          narrative. The same hashes are in <code>data/reports/2026/FREEZE.json</code>,
          which is committed, and that file rather than this rendering is what to compare
          bytes against.
        </P>
        <ReportTable id="T01" />
      </Sub>
    </Section>
  );
}

export function AppendixB() {
  return (
    <Section number="B" id="appendix-b" title="Tables in full">
      <P>
        One table appears here rather than in the body. The per-day reconciliation runs to
        one row per comparable day, which is longer than the finding it supports and reads
        better as a reference than as part of an argument.
      </P>
      <P>
        Every other table is printed where it is discussed, inside the data-table
        disclosure of the figure it belongs to or beside the paragraph that reads it.
        Reprinting them all here would double the length of the report without adding a
        number to it. All thirteen are published together as a CSV archive beside the
        PDF, which is the form to use for anything beyond reading.
      </P>
      <ReportTable id="T04" />
    </Section>
  );
}

export function AppendixC() {
  return (
    <Section number="C" id="appendix-c" title="Glossary">
      <Glossary>
        <Term term="98th percentile of daily averages">
          The statistic the 24-hour PM2.5 standard is evaluated on: the value below which{" "}
          <N k="naaqs.percentile" /> percent of a year&apos;s daily 24-hour averages fall,
          then averaged over <N k="naaqs.averaging_years" /> consecutive years. A single day, a single hour or a single short record cannot be
          compared against it.
        </Term>
        <Term term="Broad ancestral category">
          The GWAS Catalog&apos;s own classification of a study sample&apos;s genetic
          ancestry. It is the catalogue&apos;s vocabulary, not a biological partition, and it
          is not interchangeable with a census race or ethnicity category.
        </Term>
        <Term term="Collocation">
          Operating a low-cost sensor beside a reference monitor at one location so the two
          can be compared hour by hour. The comparison DEQ publishes weekly for this
          network, and the one this report recomputes.
        </Term>
        <Term term="Complete site-day">
          One site&apos;s day that carries at least <N k="completeness.valid_hours" /> of{" "}
          <N k="completeness.hours_per_day" /> valid hours, which is the threshold a
          24-hour average requires. A day below it is absent rather than
          estimated.
        </Term>
        <Term term="Discovery sample">
          The participants in a study&apos;s initial stage, as opposed to a later
          replication stage. Counts in this report are initial-stage counts, and the total
          is a sum of study sample sizes rather than a count of distinct people.
        </Term>
        <Term term="Ecological fallacy">
          Inferring something about individuals from a statistic computed over an area.
          Pairing an area&apos;s exposure with its disease prevalence cannot establish that
          the exposed people in it are the affected people.
        </Term>
        <Term term="Edition cutoff">
          The instant a DEQ weekly edition was built from. DEQ produces each edition from
          data through early on the Friday of publication; the{" "}
          <EditionDate id="deq2026aug07" /> edition was built from data through <N k="deq.edition_cutoff" />{" "}
          <Cite id="deqcorrespondence" />. An edition therefore covers less than the full
          last day, and a comparison against it has to state which day set it used.
        </Term>
        <Term term="Federal reference or equivalent method monitor">
          An instrument designated under federal regulation for determining whether an
          area meets the national standards. The regulatory PM2.5 monitor in this network is
          a federal equivalent method monitor; none of the low-cost sensors is either.
        </Term>
        <Term term="Functional (evidence class)">
          A class the published figure definition assigns to some steps of the mechanism
          chain. It is not one of the evidence types an atlas record carries (GWAS, eQTL,
          pathway, literature, inferred), and no atlas record grades the steps it labels,
          which is why the evidence table marks them as not read from a record.
        </Term>
        <Term term="Hour-ending and hour-beginning">
          Two conventions for labelling an averaged hour. The sensor dashboard labels an
          hour by the time it ended and adjusts for daylight saving; the regulatory files
          label it by the time it began and never leave standard time. Comparing the two
          without converting one to the other misaligns every pair.
        </Term>
        <Term term="Local standard time and local clock time">
          Two rules for which hours belong to which day. Standard time is the regulatory
          convention and the pipeline default; clock time follows the wall clock through
          daylight saving and is what DEQ&apos;s published sensor tables use. They agree in
          winter and differ by one hour otherwise.
        </Term>
        <Term term="Modifier">
          In the atlas, an exposure that carries a direction and an evidence grade.
          Reserved for that: a condition without an evidence grade is named specifically
          rather than called a modifier.
        </Term>

        <Term term="Site code">
          The neutral identifier each sensor location carries in every value table and
          figure here. The site key maps codes to the names DEQ publishes and carries no
          reading value.
        </Term>
      </Glossary>
    </Section>
  );
}

export function AppendixD() {
  return (
    <Section number="D" id="appendix-d" title="Changelog">
      <P>
        <strong>Version {frontmatter.version}</strong>, {frontmatter.date}. First
        release. {frontmatter.status}.
      </P>
      <P>This version establishes:</P>
      <List>
        <Item>
          The atlas scope, the module inventory at the atlas freeze date and the pipeline
          and validation gates behind it.
        </Item>
        <Item>
          Four results from reprocessing the Loudoun County sites of the DEQ Data Center
          Air Monitoring Project: the collocation reproduction, the daily-average
          reconciliation, the record-length and smoke-window effect on a percentile, and
          the cross-site correlation.
        </Item>
        <Item>
          The ancestry composition of the asthma evidence base the atlas draws on,
          descriptively, with the discovery-record gap at each in-scope locus.
        </Item>
        <Item>
          A data freeze pinning every input by hash, and a reproducibility check that runs
          the generator again on a different operating system and compares the output byte
          for byte.
        </Item>
      </List>
      <P>
        No earlier version was published. Both identifiers on the cover are pending, and
        the report is not indexed or linked from the atlas until the report identifier is
        issued.
      </P>
    </Section>
  );
}
