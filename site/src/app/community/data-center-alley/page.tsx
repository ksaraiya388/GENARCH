import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import { DeqFigure } from "@/components/deq/DeqFigure";
import { DeqHourlySeries } from "@/components/deq/DeqHourlySeries";
import { DeqPercentileBars } from "@/components/deq/DeqPercentileBars";
import { DeqCorrelationMatrix } from "@/components/deq/DeqCorrelationMatrix";
import {
  DEQ_ATTRIBUTION_PENDING,
  DEQ_DASHBOARD_LIMITATION,
  DEQ_DASHBOARD_NOTICE,
  DEQ_REPORT_LIMITATION,
  DEQ_SENSOR_LICENSE,
  DEQ_SOURCES,
} from "@/content/deq-attribution";
import {
  COMMON_WINDOW_START,
  COMPLETENESS_MIN_HOURS,
  PM25_24H_LEVEL,
  PM25_ANNUAL_LEVEL,
  RECORD_END,
  SMOKE_WINDOW,
  getCollocation,
  getCorrelations,
  getCrosswalk,
  getDailyReconciliation,
  getHourlySeries,
  getPercentiles,
  getProvenance,
  getSiteRoster,
  getSmokeSplitStats,
} from "@/lib/deq-data";

export const metadata: Metadata = {
  title: "Data Center Corridor Air Monitoring — GENARCH",
  description:
    "Virginia DEQ low-cost sensor and regulatory monitor measurements for Loudoun County, with the agency's own limitation language, a reproduction of its collocation analysis, and a record-length comparison across sites.",
};

/** Outbound attribution parameter, so DEQ can see referrals from this page in its own logs. */
function withSrc(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}src=genarch-dca`;
}

const n0 = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** Small counts are spelled out in prose and left as numerals in tables, per the site's register. */
const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];
const word = (v: number) => WORDS[v] ?? String(v);
const ORDINALS = [
  "", "first", "second", "third", "fourth", "fifth", "sixth",
  "seventh", "eighth", "ninth", "tenth",
];
const ordinal = (v: number) => ORDINALS[v] ?? `${v}th`;
const Word = (v: number) => {
  const w = word(v);
  return w.charAt(0).toUpperCase() + w.slice(1);
};

const n1 = (v: number) => v.toFixed(1);
const n2 = (v: number) => v.toFixed(2);
const n3 = (v: number) => v.toFixed(3);

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={withSrc(href)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-primary hover:text-teal-soft hover:underline"
    >
      {children}
    </a>
  );
}

function DeqQuote({ text, source }: { text: string; source: keyof typeof DEQ_SOURCES }) {
  const s = DEQ_SOURCES[source];
  return (
    <figure className="border-l-2 border-teal-soft/60 pl-4">
      <blockquote className="text-sm leading-relaxed text-surface-white">{text}</blockquote>
      <figcaption className="mt-2 text-xs text-cool-mid">
        {s.citation}
        {s.sourceUrl && (
          <>
            {". "}
            <ExternalLink href={s.sourceUrl}>{s.sourceUrl}</ExternalLink>
          </>
        )}
        {`. Retrieved ${s.retrieved}.`}
      </figcaption>
    </figure>
  );
}

export default function DataCenterCorridorPage() {
  const roster = getSiteRoster();
  const hourly = getHourlySeries();
  const splits = getSmokeSplitStats();
  const collocation = getCollocation();
  const reconciliation = getDailyReconciliation();
  const percentiles = getPercentiles();
  const correlations = getCorrelations();
  const crosswalk = getCrosswalk();
  const provenance = getProvenance();

  const deployed = roster.filter((s) => s.hasExport);
  const withoutExport = roster.filter((s) => !s.hasExport);
  const aboveLevel = percentiles.filter((p) => p.commonP98 > PM25_24H_LEVEL);
  const shortest = percentiles.reduce((a, b) => (a.fullDays <= b.fullDays ? a : b));
  const longest = percentiles.reduce((a, b) => (a.fullDays >= b.fullDays ? a : b));
  const shortestRank = percentiles.findIndex((p) => p.key === shortest.key) + 1;
  const exempt = collocation.filter((c) => !c.asserted);
  const reproducing = collocation.filter((c) => c.asserted);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs
          items={[
            { label: "Community Module", href: "/community/" },
            { label: "Data Center Corridor" },
          ]}
        />

        {/* ---------------------------------------------------------------- 1. Framing */}
        <header>
          <h1 className="text-h1 text-surface-white">Data Center Corridor Air Monitoring</h1>
          <div className="mt-3 max-w-3xl text-cool-light leading-relaxed">
            <p>
              This page presents Virginia DEQ&apos;s Data Center Air Monitoring Project
              measurements for Loudoun County, March to August 2026, alongside the regulatory
              reference monitor collocated at one sensor site. The sensors are not regulatory
              instruments, and DEQ&apos;s statement of that limitation appears below, before any
              measurement does. Almost every hour in the record sits below the level of the
              federal standards, and the highest values coincide with a wildfire smoke episode
              that reached Virginia from roughly 1,500 miles away. What follows describes what
              was measured and where; it does not establish what produced any of the values, and
              no health data appears on this page.
            </p>
          </div>
          <p className="mt-3 text-sm text-cool-mid">
            <a href="#deq-limitations" className="text-teal-primary hover:text-teal-soft hover:underline">
              DEQ&apos;s limitation statement
            </a>
            {" · "}
            <a href="#limits-heading" className="text-teal-primary hover:text-teal-soft hover:underline">
              Full limitations
            </a>
            {" · "}
            <a href="#methods-heading" className="text-teal-primary hover:text-teal-soft hover:underline">
              Data and methods
            </a>
          </p>
        </header>

        {/* -------------------------------------------- 2. DEQ attribution and limitations */}
        <section aria-labelledby="limitations-heading" className="scroll-mt-20" id="deq-limitations">
          <h2 id="limitations-heading" className="text-h2 text-surface-white mb-3">
            What DEQ says about this data
          </h2>

          <div className="rounded-lg border border-teal-soft/40 bg-navy-mid p-4 sm:p-5 space-y-5">
            <p className="text-xs uppercase tracking-wide text-cool-mid">
              Quoted verbatim from Virginia DEQ
            </p>
            <DeqQuote text={DEQ_DASHBOARD_NOTICE} source="dashboard" />
            <DeqQuote text={DEQ_DASHBOARD_LIMITATION} source="dashboard" />
            <DeqQuote text={DEQ_REPORT_LIMITATION} source="report" />
          </div>

          <div className="mt-5 max-w-3xl space-y-3 text-sm text-cool-light leading-relaxed">
            <p className="text-xs uppercase tracking-wide text-cool-mid">
              GENARCH&apos;s own wording, from here on
            </p>
            <p>
              A single hourly reading above {PM25_24H_LEVEL} µg/m³ is not measured against the
              24-hour PM2.5 standard and does not by itself show that the standard has been
              surpassed. The regulatory form of that standard is the 98th percentile of daily
              24-hour averages, averaged over three consecutive years. The separate annual
              standard is {n1(PM25_ANNUAL_LEVEL)} µg/m³, as revised in 2024. DEQ&apos;s published
              analysis makes the same point about hourly values.
            </p>
            <p>
              Sensor measurements come from the public Kunak Cloud export, by the download method
              DEQ staff confirmed on 2026-08-10, and are redistributable with credit to Virginia
              DEQ. Regulatory monitor measurements were released under Virginia FOIA request
              26-4646 on 2026-08-11, in full, and are public at{" "}
              <ExternalLink href={DEQ_SOURCES.foia.sourceUrl!}>
                vadeq.nextrequest.com/requests/26-4646
              </ExternalLink>
              .
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------- 3. Sensor network */}
        <section aria-labelledby="network-heading">
          <h2 id="network-heading" className="text-h2 text-surface-white mb-3">
            Where the sensors sit
          </h2>

          <div className="max-w-3xl space-y-3 text-cool-light leading-relaxed">
            <p>
              DEQ identified 22 potential locations in Loudoun County and has deployed seven
              sensors so far, two of which have been relocated once each. The network measures
              where it sits, and a finding drawn from these {word(deployed.length)} records
              describes those {word(deployed.length)} locations rather than the corridor as a
              whole. DEQ&apos;s wind
              rose analysis in its August 7 report concludes that the collocated Ashburn site and
              the Dulles-area site are good upwind reference locations relative to the corridor.
            </p>
            <p>
              Sensors are identified here by DEQ site identifier and locality rather than by
              DEQ&apos;s published site label. Four of the {word(roster.length)} locations are
              hosted at schools, and placing a school name beside a concentration figure invites
              an inference about children at that school that nothing in this data supports. The
              identifier crosswalk in section 9 maps every identifier to DEQ&apos;s exact
              published label, so this page can still be checked against DEQ&apos;s report.
            </p>
            <p>
              {Word(withoutExport.length)} of the {word(roster.length)} site records are not
              reachable through the public dashboard, which shows those locations without a
              device. Their historical measurements are not downloadable, so they carry no series
              anywhere on this page. {Word(withoutExport.length)} absent site records are not the
              same thing as no data at those locations.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-white/[0.08] bg-navy-mid/50">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <caption className="sr-only">
                DEQ sensor sites: identifier, locality, hardware unit, occupancy window, status,
                valid hours of PM2.5 data, and whether the site is collocated with the regulatory
                monitor.
              </caption>
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                  <th scope="col" className="py-2 px-3 font-medium">Site</th>
                  <th scope="col" className="py-2 px-3 font-medium">Area</th>
                  <th scope="col" className="py-2 px-3 font-medium">Unit</th>
                  <th scope="col" className="py-2 px-3 font-medium">Occupancy</th>
                  <th scope="col" className="py-2 px-3 font-medium">Status</th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">Valid hours</th>
                  <th scope="col" className="py-2 px-3 font-medium">Collocated</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr key={s.siteId} className="border-b border-white/[0.04]">
                    <th scope="row" className="py-2 px-3 text-left font-mono font-normal text-surface-white">
                      {s.siteId}
                    </th>
                    <td className="py-2 px-3 text-cool-light">{s.area}</td>
                    <td className="py-2 px-3 text-cool-light">
                      {s.units.map((u) => u.unitLabel).join(", ")}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-cool-light">
                      {s.startDate} to {s.endDate === "" ? "present" : s.endDate}
                    </td>
                    <td className="py-2 px-3 text-cool-light">
                      {s.hasExport
                        ? s.status === "active"
                          ? "Collecting"
                          : "Retired"
                        : "No export available"}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-cool-light">
                      {s.hasExport ? n0(s.validPm25Hours) : "—"}
                    </td>
                    <td className="py-2 px-3 text-cool-light">
                      {s.collocatedRegulatory ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 max-w-3xl text-xs text-cool-mid leading-relaxed">
            Occupancy windows and hardware unit assignments come from DEQ&apos;s site history.
            One site shows two units because the hardware was swapped in place on 2026-04-08;
            those two deployments are treated separately throughout.{" "}
            {withoutExport.length} site
            {withoutExport.length === 1 ? "" : "s"} carry no valid-hour count because no export
            exists for them: {withoutExport.map((s) => s.siteId).join(", ")}. Sensor coordinates
            are not published in machine-readable form, so no map is drawn here.
          </p>
        </section>

        {/* -------------------------------------------------------- 4. Hourly time series */}
        <section aria-labelledby="hourly-heading">
          <h2 id="hourly-heading" className="text-h2 text-surface-white mb-3">
            Hourly PM2.5, sensors and regulatory monitor
          </h2>

          <DeqFigure
            id="fig-hourly"
            heading="Hourly PM2.5 by site"
            ariaLabel={`Line chart of hourly PM2.5 concentration for ${deployed.length} DEQ sensor sites and the Ashburn regulatory monitor, from ${hourly.hours[0]?.slice(0, 10)} to ${hourly.hours[hourly.hours.length - 1]?.slice(0, 10)}. A dashed horizontal line marks ${PM25_24H_LEVEL} micrograms per cubic metre, the level of the 24-hour standard. A shaded band covers ${SMOKE_WINDOW.start} to ${SMOKE_WINDOW.end}, the wildfire smoke transport window carrying DEQ qualifier IF, in which the highest values in the record occur. Gaps in a line are hours with no valid measurement.`}
            caption={
              <>
                Sensor and regulatory series are drawn as separate lines and are never combined
                into one series: they are different instrument classes, and DEQ&apos;s regulatory
                limitation applies to the sensors alone. Hours excluded under the DEQ validity
                rule are drawn as gaps rather than as zero or as an interpolated value. Source:
                deq_data_center_air_monitoring_hourly.csv and deq_regulatory_monitor_hourly.csv.
              </>
            }
            table={{
              caption: "Show per-site summary, with and without the smoke-transport window",
              columns: [
                "Site", "Class", "Hours", "Mean µg/m³", "Max µg/m³",
                "Hours excl. smoke", "Mean excl. smoke", "Max excl. smoke",
              ],
              rows: splits.map((s) => [
                s.label,
                s.instrumentClass === "regulatory" ? "Regulatory" : "Sensor",
                n0(s.withSmoke.n), n2(s.withSmoke.mean), n2(s.withSmoke.max),
                n0(s.withoutSmoke.n), n2(s.withoutSmoke.mean), n2(s.withoutSmoke.max),
              ]),
            }}
          >
            <DeqHourlySeries payload={hourly} standardLevel={PM25_24H_LEVEL} />
          </DeqFigure>

          <div className="mt-5 max-w-3xl space-y-3 text-cool-light leading-relaxed">
            <p>
              Every summary figure near this chart is given twice, once over the whole record and
              once with 2026-07-16 to 2026-07-19 removed. A statistic pooled across the smoke
              episode and ordinary conditions sits between two regimes and describes neither.
              {splits
                .filter((s) => s.instrumentClass === "regulatory")
                .map((s) => (
                  <span key={s.key}>
                    {" "}
                    At the regulatory monitor the mean over the full record is{" "}
                    {n2(s.withSmoke.mean)} µg/m³ across {n0(s.withSmoke.n)} valid hours, and{" "}
                    {n2(s.withoutSmoke.mean)} µg/m³ across {n0(s.withoutSmoke.n)} hours with the
                    smoke window removed. The highest single hour in the whole record,{" "}
                    {n1(s.withSmoke.max)} µg/m³, falls inside that window; outside it the highest
                    hour is {n1(s.withoutSmoke.max)} µg/m³.
                  </span>
                ))}
            </p>
            <p>
              Four separate periods are voided in the source data, and the chart shows each as a
              gap. DEQ&apos;s August 7 report records regulatory PM2.5 voided 2026-05-07 to 05-10
              and 2026-06-16 to 07-14 for failed data quality analysis and instrumentation
              issues, regulatory NO2 voided 2026-05-07 to 05-10, sensor PM2.5 voided 2026-03-03
              to 03-08 at every site for high humidity and sensor data quality, and PM2.5
              collection at one retired site ending 2026-05-30 after an air flow failure in the
              particle sensor. In the released record the fully void days are narrower than the
              stated windows, 05-08 to 05-09 and 06-17 to 07-13, because the days at each
              boundary are partly valid.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------- 5. Collocation */}
        <section aria-labelledby="collocation-heading">
          <h2 id="collocation-heading" className="text-h2 text-surface-white mb-3">
            Sensor against regulatory monitor at the collocated site
          </h2>

          <div className="max-w-3xl space-y-3 text-cool-light leading-relaxed">
            <p>
              DEQ operates one sensor at the same location as its regulatory reference monitor,
              and has published a regression between the two every week since the project began.
              Two different hardware units have occupied that position: {collocation[0].unitLabel}{" "}
              from 2026-03-03 to 2026-04-08 and {collocation[1].unitLabel} from 2026-04-08 onward.
              They are treated separately throughout, since pooling two instruments into one
              regression describes neither.
            </p>
            <p>
              The table sets DEQ&apos;s published coefficients beside coefficients computed by
              GENARCH&apos;s pipeline from the source tables. This is a verification of that
              pipeline against an authoritative source, not a new result: DEQ published the
              analysis first and publishes it on a weekly cycle.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-white/[0.08] bg-navy-mid/50">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">
                DEQ published regression coefficients beside coefficients computed by GENARCH,
                for each hardware unit and pollutant. Sensor on the x axis, regulatory monitor on
                the y axis.
              </caption>
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                  <th scope="col" className="py-2 px-3 font-medium">Comparison</th>
                  <th scope="col" className="py-2 px-3 font-medium">DEQ published</th>
                  <th scope="col" className="py-2 px-3 font-medium">GENARCH</th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">n</th>
                </tr>
              </thead>
              <tbody>
                {collocation.map((c) => (
                  <tr key={c.key} className="border-b border-white/[0.04]">
                    <th scope="row" className="py-2 px-3 text-left font-normal text-surface-white">
                      {c.unitLabel} {c.pollutant}
                    </th>
                    <td className="py-2 px-3 font-mono text-xs text-cool-light">
                      y = {c.deq.intercept} + {c.deq.slope}x, R² = {c.deq.r2}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-cool-light">
                      y = {n3(c.genarch.intercept)} + {n3(c.genarch.slope)}x, R² ={" "}
                      {n3(c.genarch.r2)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-cool-light">
                      {n0(c.genarch.n)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 max-w-3xl space-y-3 text-cool-light leading-relaxed">
            <p>
              {Word(reproducing.length)} of the {word(collocation.length)}{" "}
              comparisons reproduce DEQ&apos;s published coefficients to within the tolerance the
              build enforces, which is 0.05 on slope and intercept and 0.03 on R². The remaining
              comparison,{" "}
              {exempt.map((c) => `${c.unitLabel} ${c.pollutant}`).join(" and ")}, is close but not
              exact: slope {n3(exempt[0].genarch.slope)} against DEQ&apos;s {exempt[0].deq.slope}{" "}
              and R² {n3(exempt[0].genarch.r2)} against {exempt[0].deq.r2}. The residual
              difference is not explained here, and it is disclosed rather than resolved. Note
              also that DEQ publishes these coefficients to two significant figures, so part of
              every difference in the table is that rounding rather than a difference in the
              underlying fit.
            </p>
            <p>
              Applying the same null-code and flag exclusions and an{" "}
              {COMPLETENESS_MIN_HOURS}-of-24 completeness rule, recomputed daily averages match
              DEQ&apos;s published daily file on {reconciliation.matching} of{" "}
              {reconciliation.compared} comparable days after truncation to one decimal, with a
              mean absolute difference of {reconciliation.meanAbsoluteDifference.toFixed(4)}{" "}
              µg/m³. DEQ truncates published values rather than rounding them.
            </p>
            <p className="text-sm">
              DEQ&apos;s analysis:{" "}
              <ExternalLink href={DEQ_SOURCES.report.sourceUrl!}>
                Data Center Air Quality Analysis, August 7, 2026
              </ExternalLink>
              {". "}
              Project page:{" "}
              <ExternalLink href={DEQ_SOURCES.project.sourceUrl!}>
                Virginia DEQ Data Center Air Monitoring
              </ExternalLink>
              .
            </p>
          </div>
        </section>

        {/* --------------------------------------------------- 6. Record length and p98 */}
        <section aria-labelledby="record-length-heading">
          <h2 id="record-length-heading" className="text-h2 text-surface-white mb-3">
            Record length and the percentile comparison
          </h2>

          <div className="max-w-3xl space-y-3 text-cool-light leading-relaxed">
            <p>
              Table 4 of DEQ&apos;s August 7 report states that one sensor is the only one whose
              98th percentile of daily PM2.5 averages sits above {PM25_24H_LEVEL} µg/m³. That
              sensor, {shortest.key}, also has the shortest record in the network. It began
              collecting on {COMMON_WINDOW_START} and has {shortest.fullDays} days, against{" "}
              {longest.fullDays} at {longest.key}. Its entire record falls in high summer and
              includes the smoke-transport weekend, which is {n1(shortest.smokeShare)} percent of
              its record against {n1(longest.smokeShare)} percent of the longest one.
            </p>
            <p>
              Restricting every sensor to the window in which all {word(deployed.length)} were
              collecting, {COMMON_WINDOW_START} to {RECORD_END}, changes the ordering.{" "}
              {Word(aboveLevel.length)} of {word(percentiles.length)} sites sit above{" "}
              {PM25_24H_LEVEL} µg/m³ on matched windows, and {shortest.key} ranks{" "}
              {ordinal(shortestRank)} rather than first. The apparent difference between sites is
              a difference in record length.
            </p>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-white/[0.08] bg-navy-mid/50">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <caption className="sr-only">
                For each site: days and 98th percentile of daily PM2.5 averages over its own
                record, and over the common window in which all deployed sensors were collecting.
              </caption>
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                  <th scope="col" className="py-2 px-3 font-medium">Site</th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">Days, own record</th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">p98, own record</th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">Days, common</th>
                  <th scope="col" className="py-2 px-3 text-right font-medium">p98, common</th>
                </tr>
              </thead>
              <tbody>
                {percentiles.map((p) => (
                  <tr key={p.key} className="border-b border-white/[0.04]">
                    <th scope="row" className="py-2 px-3 text-left font-mono font-normal text-surface-white">
                      {p.key}
                    </th>
                    <td className="py-2 px-3 text-right font-mono text-cool-light">{p.fullDays}</td>
                    <td className="py-2 px-3 text-right font-mono text-cool-light">{n2(p.fullP98)}</td>
                    <td className="py-2 px-3 text-right font-mono text-cool-light">{p.commonDays}</td>
                    <td className="py-2 px-3 text-right font-mono text-cool-light">{n2(p.commonP98)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <DeqFigure
              id="fig-percentiles"
              heading="98th percentile, own record against common window"
              ariaLabel={`Horizontal grouped bar chart. For each of ${percentiles.length} DEQ sensor sites, one bar gives the 98th percentile of daily PM2.5 averages over that site's own record and a second gives it over the common window of ${COMMON_WINDOW_START} to ${RECORD_END}. A dashed vertical line marks ${PM25_24H_LEVEL} micrograms per cubic metre. On the common window ${aboveLevel.length} of ${percentiles.length} sites sit above that line, compared with fewer over the unmatched records.`}
              caption={
                <>
                  Daily averages are computed under the {COMPLETENESS_MIN_HOURS}-of-24
                  completeness rule, and each site&apos;s record is cut at {RECORD_END} to match
                  the date of DEQ&apos;s report. Neither set of percentiles is comparable to the
                  federal standard; see the qualifications below. Source:
                  deq_data_center_air_monitoring_hourly.csv.
                </>
              }
              table={{
                caption: "Show the percentile table, including smoke-window share of each record",
                columns: [
                  "Site", "Days, own record", "p98, own record",
                  "Days, common", "p98, common", "Smoke share of record",
                ],
                rows: percentiles.map((p) => [
                  p.label, p.fullDays, n2(p.fullP98), p.commonDays, n2(p.commonP98),
                  `${n1(p.smokeShare)}%`,
                ]),
              }}
            >
              <DeqPercentileBars rows={percentiles} standardLevel={PM25_24H_LEVEL} />
            </DeqFigure>
          </div>

          <div className="mt-5 max-w-3xl space-y-3 text-sm text-cool-light leading-relaxed">
            <p className="text-xs uppercase tracking-wide text-cool-mid">
              Three qualifications on the numbers above
            </p>
            <p>
              Neither DEQ&apos;s figures nor these are comparable to the federal standard. That
              standard is a 98th percentile of daily averages across a full year, averaged over
              three years. A {shortest.commonDays}-day percentile is not that statistic, and
              nothing about attainment or non-attainment follows from either set of numbers.
            </p>
            <p>
              This corrects a comparison between monitoring sites. It is not a statement that any
              location is polluted, and it is not a statement about anyone&apos;s health.
            </p>
            <p>
              GENARCH&apos;s own-record percentiles differ from DEQ&apos;s Table 4 by up to
              roughly 2.4 µg/m³ in both directions, higher at some sites and lower at others. The
              most likely explanation is the treatment of exact-zero sensor readings, which this
              pipeline excludes as a fault mode rather than counting as measurements. That
              explanation is not established, and the difference is disclosed here rather than
              resolved.
            </p>
          </div>
        </section>

        {/* --------------------------------------------------- 7. Cross-site correlation */}
        <section aria-labelledby="correlation-heading">
          <h2 id="correlation-heading" className="text-h2 text-surface-white mb-3">
            How closely the sites track each other
          </h2>

          <DeqFigure
            id="fig-correlation"
            heading="Pairwise correlation of hourly PM2.5"
            ariaLabel={`Matrix of pairwise correlation coefficients for hourly PM2.5 between ${correlations.keys.length} DEQ sensor sites, with the smoke-transport window excluded. All ${correlations.pairs.length} pairwise coefficients fall between ${n3(correlations.rMin)} and ${n3(correlations.rMax)}. The number of overlapping hours behind each coefficient ranges from ${n0(correlations.nMin)} to ${n0(correlations.nMax)}.`}
            caption={
              <>
                Smoke-transport window excluded, and exact-zero sensor readings treated as
                missing rather than as measurements. Hour counts differ by pair because the sites
                were not all collecting over the same period. Source:
                deq_data_center_air_monitoring_hourly.csv.
              </>
            }
            table={{
              caption: "Show every pair as a list, with its hour count",
              columns: ["Site A", "Site B", "r", "Overlapping hours"],
              rows: correlations.pairs
                .slice()
                .sort((a, b) => b.r - a.r)
                .map((p) => [p.a, p.b, n3(p.r), n0(p.n)]),
            }}
          >
            <DeqCorrelationMatrix payload={correlations} />
          </DeqFigure>

          <div className="mt-5 max-w-3xl space-y-3 text-cool-light leading-relaxed">
            <p>
              All {correlations.pairs.length} pairwise correlations fall between{" "}
              {n3(correlations.rMin)} and {n3(correlations.rMax)}. This is a description of how
              the series move together and nothing more. High spatial correlation does not
              establish that local sources contribute nothing: the deployed sensors may sit
              largely upwind, and a local increment can be masked by a dominant regional signal.
            </p>
            <p>
              The ratio between the highest and lowest site reading in a given hour is not a
              usable discriminator here. It fails below roughly 30 µg/m³, where small absolute
              differences produce large ratios. Across{" "}
              {n0(correlations.ratioN)} hours the median ratio is{" "}
              {n2(correlations.ratioMedian)}, and low-concentration hours reach ratios above{" "}
              {Math.floor(correlations.ratioMax)} from differences under a microgram per cubic
              metre.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------- 8. Limitations */}
        <section aria-labelledby="limits-heading">
          <h2 id="limits-heading" className="text-h2 text-surface-white mb-3 scroll-mt-20">
            Limitations
          </h2>
          <EvidenceLimitations>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                DEQ&apos;s own limitation language is quoted in full{" "}
                <Link href="#deq-limitations" className="text-teal-primary hover:text-teal-soft hover:underline">
                  at the top of this page
                </Link>{" "}
                and governs every sensor figure below it.
              </li>
              <li>
                Sensor data has not passed quality assurance validation. Regulatory data carries
                validity flags and null codes; sensor data carries none. The two records are not
                symmetric, and a disagreement between them has several candidate explanations,
                including sensor accuracy, the absence of quality assurance on one side, and the
                difference in timestamp convention.
              </li>
              <li>
                Exact-zero sensor readings occur in multi-hour runs at every site and are treated
                here as missing rather than as measurements.
              </li>
              <li>
                Kunak timestamps are hour-ending and adjusted for daylight saving; regulatory
                timestamps are hour-beginning and always EST. Values are normalised to a common
                convention before any comparison, per DEQ&apos;s instruction.
              </li>
              <li>
                Meteorological data appears on DEQ&apos;s dashboard but is not available through
                the historical export. No wind-direction analysis is performed here.
              </li>
              <li>
                Seven of 22 identified locations have been deployed. Findings describe the
                deployed locations, not the corridor.
              </li>
              <li>
                No health data appears on this page and no health inference is drawn from it.
              </li>
            </ul>
          </EvidenceLimitations>
        </section>

        {/* --------------------------------------------------------- 9. Data and methods */}
        <section aria-labelledby="methods-heading">
          <h2 id="methods-heading" className="text-h2 text-surface-white mb-3 scroll-mt-20">
            Data and methods
          </h2>

          <h3 className="text-h3 text-surface-white mb-2">Site identifier crosswalk</h3>
          <p className="mb-3 max-w-3xl text-sm text-cool-light leading-relaxed">
            This table carries identifiers only. It holds no measurement of any kind, and none
            may be added to it. It exists so that a reader can map every identifier used on this
            page onto DEQ&apos;s published site labels and check the work against DEQ&apos;s
            report.
          </p>
          <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-navy-mid/50">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <caption className="sr-only">
                Crosswalk from GENARCH site identifier to locality, DEQ published site label, and
                the label string shown on the Kunak dashboard.
              </caption>
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                  <th scope="col" className="py-2 px-3 font-medium">GENARCH identifier</th>
                  <th scope="col" className="py-2 px-3 font-medium">Area</th>
                  <th scope="col" className="py-2 px-3 font-medium">DEQ published label</th>
                  <th scope="col" className="py-2 px-3 font-medium">Kunak dashboard label</th>
                </tr>
              </thead>
              <tbody>
                {crosswalk.map((c) => (
                  <tr key={c.siteId} className="border-b border-white/[0.04]">
                    <th scope="row" className="py-2 px-3 text-left font-mono font-normal text-surface-white">
                      {c.siteId}
                    </th>
                    <td className="py-2 px-3 text-cool-light">{c.area}</td>
                    <td className="py-2 px-3 text-cool-light">{c.deqLabel}</td>
                    <td className="py-2 px-3 text-cool-light">{c.kunakLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-h3 text-surface-white mt-8 mb-2">Source tables</h3>
          <div className="overflow-x-auto rounded-lg border border-white/[0.08] bg-navy-mid/50">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <caption className="sr-only">
                Provenance for each source table: retrieval method, retrieval date, coverage,
                licence, and a download link.
              </caption>
              <thead>
                <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                  <th scope="col" className="py-2 px-3 font-medium">File</th>
                  <th scope="col" className="py-2 px-3 font-medium">Retrieval</th>
                  <th scope="col" className="py-2 px-3 font-medium">Date</th>
                  <th scope="col" className="py-2 px-3 font-medium">Licence</th>
                </tr>
              </thead>
              <tbody>
                {provenance.map((p) => (
                  <tr key={p.file} className="border-b border-white/[0.04]">
                    <th scope="row" className="py-2 px-3 text-left font-normal">
                      <a
                        href={`/data/deq/${p.file}`}
                        download
                        className="font-mono text-xs text-teal-primary hover:text-teal-soft hover:underline"
                      >
                        {p.file}
                      </a>
                      {p.bytes > 0 && (
                        <span className="ml-2 text-xs text-cool-mid">
                          {(p.bytes / 1_048_576).toFixed(1)} MB
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-cool-mid">{p.coverage}</span>
                    </th>
                    <td className="py-2 px-3 text-xs text-cool-light">{p.retrievalMethod}</td>
                    <td className="py-2 px-3 font-mono text-xs text-cool-light">
                      {p.downloadDate}
                    </td>
                    <td className="py-2 px-3 text-xs text-cool-light">{p.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 max-w-3xl space-y-3 text-sm text-cool-light leading-relaxed">
            <h3 className="text-h3 text-surface-white">Exclusion rule</h3>
            <p>
              A reading is excluded if the value is missing, an AQS Null Code is present, or the
              Flags field contains a less-than character. No letter code alone excludes a
              reading. Flags are case-sensitive: the same letter in upper and lower case
              identifies two different events, and folding the case of that column silently
              merges them. A 24-hour average is computed only from{" "}
              {COMPLETENESS_MIN_HOURS} or more valid hours. The full rule set is recorded in{" "}
              <span className="font-mono text-xs">docs/GENARCH_RULES.md</span> section 3.
            </p>

            <h3 className="text-h3 text-surface-white pt-2">Licence and attribution</h3>
            <p>
              {DEQ_SENSOR_LICENSE} {DEQ_ATTRIBUTION_PENDING}
            </p>
            <p>
              Sensor coordinates are not published in machine-readable form. A map of the network
              will be added here once a citable coordinate source is available from DEQ.
            </p>
            <p>
              Pipeline source and page source:{" "}
              <ExternalLink href="https://github.com/ksaraiya388/GENARCH">
                github.com/ksaraiya388/GENARCH
              </ExternalLink>
              {". "}
              GENARCH methods:{" "}
              <Link href="/methods/" className="text-teal-primary hover:text-teal-soft hover:underline">
                /methods
              </Link>
              .
            </p>
          </div>
        </section>
      </article>
    </div>
  );
}
