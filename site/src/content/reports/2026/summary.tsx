import { Callout, Cite, DeqLimitation, Lead, N, P, Section } from "./bound";

/**
 * The summary, held to one page.
 *
 * The order is fixed by the project's content constraints rather than by taste. The
 * constraint statement comes first, because a reader who stops after one paragraph
 * must not leave with a causal reading. The sensor limitation and the share of days
 * below the 24-hour level come second, before any percentile, because the
 * limitations have to be prominent and early rather than filed at the back. The
 * findings come third and the exclusions fourth.
 */
export function Summary() {
  return (
    <Section id="summary" title="Summary" pageBreak={false}>
      <Lead>
        This is the first annual report of GENARCH, a read-only scientific atlas of
        gene-environment interactions for Loudoun County, Virginia. It does two things.
        It states what the atlas contains at its freeze date and how the atlas is
        built, and it reprocesses the sensor and regulatory monitoring data that
        Virginia DEQ publishes for its Data Center Air Monitoring Project in Loudoun
        County, recomputing the agency&apos;s published statistics from the source
        files. Everything here describes co-location and biological mechanism. Nothing
        here establishes that any exposure brought about any health outcome in any
        population, and no statement in this report should be read that way.
      </Lead>

      <DeqLimitation id="summary-deq-limitation" />

      <P>
        Against that standard, the record is mostly unremarkable:{" "}
        <N k="summary.share_site_days_below_35" /> percent of the{" "}
        <N k="summary.share_site_days_below_35" fmt="n" /> complete site-days across the
        nine Loudoun County sensor sites sit below{" "}
        <N k="naaqs.daily_standard" /> µg/m³, the level of the 24-hour standard{" "}
        <Cite id="cfr5018" />. That level is not a line a daily reading crosses or
        fails: the standard is evaluated as the{" "}
        <N k="naaqs.percentile" />
        th percentile of daily averages, averaged over{" "}
        <N k="naaqs.averaging_years" /> consecutive years{" "}
        <Cite id="cfr50appn" />, and a low-cost sensor record cannot be evaluated
        against it at all.
      </P>

      <P>
        Four results are reported. The four collocation regressions at the collocated
        site agree with DEQ&apos;s published coefficients within{" "}
        <N k="colloc.tolerance_coefficient" /> on slope and intercept and{" "}
        <N k="colloc.tolerance_r2" /> on R-squared, computed through DEQ&apos;s{" "}
        <N k="deq.edition_cutoff" /> edition cutoff. Recomputed daily averages for the
        regulatory monitor match DEQ&apos;s published daily file on{" "}
        <N k="daily.n_match" /> of <N k="daily.n_days" /> comparable days, with a mean
        absolute difference of <N k="daily.mean_abs_diff" /> µg/m³. On the window when
        all six sensors were collecting, <N k="p98.common.n_above_35" /> of six exceed{" "}
        <N k="naaqs.daily_standard" /> µg/m³ and the sensor DEQ&apos;s Table 4 of{" "}
        <Cite id="deq2026aug07" /> identifies as the only one above that level, site
        DC-06 in the site key, ranks fourth — which is a statement about unequal record length and season and
        not about any site being polluted, and neither DEQ&apos;s figure nor this one is
        comparable to the national standards. Hourly PM2.5 correlates between{" "}
        <N k="corr.min" /> and <N k="corr.max" /> across every pair of the six sensors
        outside the smoke window, which is descriptive and does not establish that
        local sources contribute nothing.
      </P>

      <Callout title="What this version does not contain">
        <P>
          No cross-ancestry gene-environment effect estimates are reported in this
          version; they are planned for a later phase. The paired-site analysis of the
          two units that shared a location is not included. Carbon monoxide is not
          analysed, because the averaging period of the published sensor series is
          unresolved. No association between tract-level exposure and tract-level
          prevalence is reported anywhere in this report or on the atlas.
        </P>
      </Callout>
    </Section>
  );
}
