import { Cite, N, P, Section } from "./bound";

export function DataAndProvenance() {
  return (
    <Section number="2" id="data" title="Data and provenance">
      <P>
        Every input the analysis reads is listed in Appendix A with its origin, its
        licence, its export date, its data cutoff and its SHA-256. Nothing outside that
        list is read. The sensor exports are named there by neutral site code rather
        than by filename, because the published filenames carry a site identifier that
        the project&apos;s content constraints keep out of public output. There are
        twenty-six inputs in three groups: the hourly sensor exports, in two sets
        because the collocation reproduction reads the exports the original analysis
        was computed from rather than the later ones; the regulatory monitor files
        released under the records request; and the DEQ weekly editions the published
        figures are taken from.
      </P>

      <P>
        The sensor data are hourly exports from the Kunak dashboard DEQ publishes the
        network through <Cite id="deqdashboard" />. Two properties of that dashboard
        shape how it has to be read. The first is that values appear as soon as they
        are detected, before any quality assurance, which the dashboard states itself;
        the files carry no null code, no flag and no qualifier column, so there is no
        way to tell a suspect hour from a good one on the sensor side. The second is
        that the dashboard backfills hours that were previously absent, and it does so
        without notice. Every export in the freeze therefore records its own export
        date and its own data cutoff, and the report states which of the two input sets
        each result was computed from.
      </P>

      <P>
        The backfill is not hypothetical. Comparing the exports taken for the original
        August analysis against those taken for the freeze, nine hours that had been
        missing have since been filled with rows in which every pollutant channel reads
        zero. A row in which every channel reads zero is treated as missing throughout
        this work, so those nine hours stay missing, and the one place where that
        decision changes a published figure is recorded with the figure rather than
        folded into it.
      </P>

      <P>
        The regulatory monitor data came through a Virginia Freedom of Information Act
        request, 26-4646, released in full with no redactions and at no cost{" "}
        <Cite id="foia264646" />. That release is the binding constraint on two of the
        four results: the hourly files end 2026-08-10 and the last complete day is
        2026-08-09, so no collocation fit and no daily reconciliation can extend past
        that date, whatever the sensor record does. A follow-up request for a longer
        range is pending.
      </P>

      <P>
        The freeze itself was taken on 2026-10-18 at commit{" "}
        <N k="freeze.commit" group={false} />, and the atlas half was frozen separately
        on <N k="inventory.frozen_at" /> once the atlas records had settled. The freeze
        pins each input by hash and the generator refuses to read a file whose hash no
        longer matches, which is what makes the weekly DEQ ingest safe: new editions
        keep arriving and keep being recorded, and none of them moves a number in this
        report. The three configuration inputs the generator needs (the source
        manifest, the sensor site history and the site-code lookup) are pinned as frozen
        copies for the same reason.
      </P>
    </Section>
  );
}
