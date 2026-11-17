import { Callout, Cite, DeqLimitation, EditionDate, Lead, N, P, Section } from "./bound";

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
        This is GENARCH&apos;s annual report for 2026. GENARCH is a read-only scientific
        atlas of gene-environment interactions for Loudoun County, Virginia. It does three
        things. It states what the atlas contains at its freeze date and how the atlas
        is built, it describes who the asthma evidence the atlas draws on was measured
        in, and it reprocesses the sensor and regulatory monitoring data that
        Virginia DEQ publishes for its Data Center Air Monitoring Project in Loudoun
        County, recomputing the agency&apos;s published statistics from the source
        files. Everything here describes co-location and biological mechanism. Nothing
        here establishes that any exposure brought about any health outcome in any
        population, and no statement in this report should be read that way.
      </Lead>

      <DeqLimitation id="summary-deq-limitation" />

      <P>
        Through the <N k="freeze.cutoff_date" /> data cutoff,{" "}
        <N k="summary.share_site_days_below_35" /> percent of the{" "}
        <N k="summary.share_site_days_below_35" fmt="n" /> complete site-days across the
        nine Loudoun County sensor sites sit below{" "}
        <N k="naaqs.daily_standard" /> µg/m³, the level of the 24-hour standard{" "}
        <Cite id="cfr5020" />. All <N k="summary.site_days_at_or_above_35" /> site-days
        at or above that level fall in the wildfire smoke window of{" "}
        <N k="smoke.window_start" /> to <N k="smoke.window_end" />; with that window
        excluded, all <N k="summary.share_site_days_below_35.ex_smoke" fmt="n" />{" "}
        site-days sit below it. That level is not a line a daily reading crosses or
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
        all six sensors were collecting, on whole days through{" "}
        <N k="network.common_window.end" /> (DEQ&apos;s edition cutoff{" "}
        <N k="deq.edition_cutoff" />), <N k="p98.common.n_above_35" fmt="count" /> of the{" "}
        <N k="p98.common.n_sites" /> have a daily PM2.5 98th percentile above{" "}
        <N k="naaqs.daily_standard" /> µg/m³, and the sensor that Table 4 of DEQ&apos;s{" "}
        <EditionDate id="deq2026aug07" /> edition <Cite id="deq2026aug07" /> identifies
        as the only one above that level, site DC-06 in the site key, ranks{" "}
        <N k="p98.common.rank.DC-06" fmt="ordinal" />. With the smoke window excluded,{" "}
        <N k="p98.common_exsmoke.n_above_35" fmt="count" /> of the{" "}
        <N k="p98.common.n_sites" /> is above that level and site DC-06 still ranks{" "}
        <N k="p98.common_exsmoke.rank.DC-06" fmt="ordinal" />. DEQ&apos;s table reported
        each sensor&apos;s value over its own record; the comparison between sensors did
        not hold because the records differed in length and in how much weight the smoke
        weekend carried in each. This is not a claim that DEQ&apos;s figures were wrong or
        that any site is polluted, and neither DEQ&apos;s figure nor this one is
        comparable to the national standards. Hourly PM2.5 correlates between{" "}
        <N k="corr.min" /> and <N k="corr.max" /> across every pair of the six sensors
        outside the smoke window, which is descriptive and does not establish that
        local sources contribute nothing.
      </P>

      <P>
        The asthma evidence the atlas draws on was measured overwhelmingly in one
        ancestry group: <N k="ancestry.discovery.european.share" /> percent of the
        initial-stage discovery total across <N k="ancestry.discovery.studies" /> asthma
        studies in the GWAS Catalog falls in the catalogue&apos;s European category, where
        that total is a sum of study sample sizes and not a headcount of people. At the
        locus at 17q12-21, <N k="ancestry.loci.17q12-21.european.associations" /> of{" "}
        <N k="ancestry.loci.17q12-21.associations" /> associations have a European
        discovery sample and <N k="ancestry.loci.17q12-21.south_asian.associations" fmt="count" />{" "}
        a South Asian one, which is a gap in the discovery record and not evidence that
        the locus is absent or inactive in any population.
      </P>

      <Callout title="What this version does not contain">
        <P>
          No cross-ancestry gene-environment effect estimates are reported in this
          version; they are planned for a later phase. The analysis of the one sensor unit
          that occupied two sites in turn is not included. Carbon monoxide is not
          analysed, because the averaging period of the published sensor series is
          unresolved. No association between tract-level exposure and tract-level
          prevalence is reported anywhere in this report or on the atlas (see section
          7.5).
        </P>
      </Callout>
    </Section>
  );
}
