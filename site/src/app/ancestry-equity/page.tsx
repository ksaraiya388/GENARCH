import Link from "next/link";
import type { Metadata } from "next";
import { getAllCrossAncestry, getMechanismBrief, getDisease } from "@/lib/data";
import {
  getAcsLoudoun,
  getLiterature,
  citeShort,
  formatAcsCount,
  formatAcsPercent,
  findExtraction,
} from "@/lib/cross-ancestry";
import { buildFigurePayload } from "@/lib/figure-data";
import { FIGURE_COLORS } from "@/lib/figures";
import type { Reference } from "@/lib/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import { CitationRenderer, InlineCitation } from "@/components/CitationRenderer";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { BarRows } from "@/components/figures/BarRows";

export const metadata: Metadata = {
  title: "Ancestry & Equity | GENARCH",
  description:
    "What published studies measured about polygenic score transferability across ancestry groups, for type 2 diabetes, coronary artery disease and asthma, set beside Loudoun County's population. Population-level only.",
};

/** Dark-theme palette for the in-page charts. The export figures use the light one. */
const PAGE_BARS = {
  bar: FIGURE_COLORS.tealSoft,
  barEmphasis: FIGURE_COLORS.teal,
  track: "rgba(255,255,255,0.07)",
  label: "#F8FAFC",
  sublabel: "#94A3B8",
  value: "#F8FAFC",
};

const SECTION = "scroll-mt-24";

function ensureRefAuthors(refs: Reference[]) {
  return refs.map((r) => ({ ...r, authors: r.authors ?? "Unknown" }));
}

export default function AncestryEquityPage() {
  const modules = getAllCrossAncestry();
  const acs = getAcsLoudoun();
  const lit = getLiterature();
  const brief = getMechanismBrief("t2d-south-asian-prs-transferability");

  const gwasFig = buildFigurePayload("gwas-ancestry-imbalance");
  const gwas = gwasFig?.id === "gwas-ancestry-imbalance" ? gwasFig.data : null;
  const prsFig = buildFigurePayload("prs-portability");
  const prs = prsFig?.id === "prs-portability" ? prsFig.data : null;

  const litById = new Map(lit.map((e) => [e.id, e]));

  // Fatumo 2022 is the only verified source that itemises South Asian and
  // Hispanic/Latino GWAS participation separately, so its five-group breakdown is
  // given as a table beside the two-group snapshot chart. Different denominator,
  // different source, deliberately NOT merged into the chart.
  const fieldShare = (
    [
      ["European", "fatumo2022-gwas-share-european"],
      ["East Asian", "fatumo2022-gwas-share-east-asian"],
      ["African", "fatumo2022-gwas-share-african"],
      ["South Asian", "fatumo2022-gwas-share-south-asian"],
      ["Hispanic/Latino", "fatumo2022-gwas-share-hispanic-latino"],
    ] as const
  )
    .map(([group, claimId]) => ({
      group,
      value: findExtraction(lit, "fatumo2022", claimId)?.value ?? null,
    }))
    .filter((r) => r.value !== null);

  // One reference list for the page: the union of the shipped modules' references,
  // plus the two provenance pointers cited only in the methods section.
  const refMap = new Map<string, Reference>();
  for (const m of modules) {
    for (const r of m.references) if (!refMap.has(r.id)) refMap.set(r.id, r);
  }
  for (const extra of [
    {
      id: "nasem2023",
      title: "Using Population Descriptors in Genetics and Genomics Research",
      authors: "National Academies of Sciences, Engineering, and Medicine",
      year: 2023,
      doi: "10.17226/26902",
    },
    {
      id: "mills2020",
      title: "The GWAS Diversity Monitor tracks diversity by disease in real time",
      authors: "Mills MC, Rahal C",
      year: 2020,
      journal: "Nature Genetics",
      doi: "10.1038/s41588-020-0580-y",
    },
  ] as Reference[]) {
    if (!refMap.has(extra.id)) refMap.set(extra.id, extra);
  }
  // Array.from rather than a spread: the tsconfig target predates downlevelIteration.
  const refs = ensureRefAuthors(Array.from(refMap.values()));

  const dp05 = acs?.profile_dp05;
  const b02015 = acs?.detail_b02015;

  const southAsianGroups = b02015
    ? ([
        ["Asian Indian", b02015.asian_indian],
        ["Pakistani", b02015.pakistani],
        ["Nepalese", b02015.nepalese],
        ["Bangladeshi", b02015.bangladeshi],
        ["Sri Lankan", b02015.sri_lankan],
      ] as const)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-12">
        <Breadcrumbs items={[{ label: "Ancestry & Equity" }]} />

        {/* ── 1. Scope ── */}
        <header>
          <h1 className="text-h1 text-surface-white">Ancestry &amp; Equity</h1>
          <div className="prose prose-sm max-w-none text-cool-light mt-4 space-y-3">
            <p>
              Most of the genetic evidence this atlas rests on was collected in
              European-ancestry study populations. Polygenic scores built from that
              evidence are measurably less accurate when applied to other ancestry
              groups. This page collects what published studies measured about that gap
              for three diseases, and sets it beside who actually lives in Loudoun
              County.
            </p>
            <p>
              <strong className="text-surface-white">Scope.</strong> Everything here is
              population-level. Every figure is a group-level statistic from a published
              study population, and none of it describes an individual. Nothing here
              asserts causation: these are measurements of how well a statistical model
              transfers between study populations, not findings about what produces
              disease. This is not a risk tool. GENARCH computes no polygenic score,
              stores no genetic data, and has nowhere to enter a genotype. GENARCH also
              ran no new analysis for this page: it summarises what the cited studies
              reported, and every number is traceable to a verified source.
            </p>
          </div>
        </header>

        {/* ── 2. Who lives in Loudoun ── */}
        <section aria-labelledby="loudoun-heading" id="loudoun" className={SECTION}>
          <h2 id="loudoun-heading" className="text-h2 text-surface-white mb-3">
            Who lives in Loudoun
          </h2>
          {acs && dp05 ? (
            <>
              <p className="text-sm text-cool-light mb-4">
                {acs.vintage}, {acs.geography}. Retrieved {acs.retrieved_at} from the
                Census Bureau API. Labels below are the Bureau&rsquo;s own, verbatim.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
                  <caption className="sr-only">
                    Loudoun County population counts and published percentages, with
                    margins of error, from the 2023 ACS 5-year estimates.
                  </caption>
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Census label
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Count
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Share of county
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {(
                      [
                        ["Total population", dp05.total_population],
                        ["Asian alone", dp05.asian_alone],
                        [
                          "Black or African American alone",
                          dp05.black_or_african_american_alone,
                        ],
                        [
                          "Hispanic or Latino (of any race)",
                          dp05.hispanic_or_latino_any_race,
                        ],
                      ] as const
                    ).map(([label, cell]) => (
                      <tr key={label} className="hover:bg-white/[0.04]">
                        <th scope="row" className="text-left px-4 py-2 font-normal text-cool-light">
                          {label}
                          <span className="block text-xs text-cool-mid font-mono mt-1">
                            {cell?.variable}
                          </span>
                        </th>
                        <td className="px-4 py-2 text-surface-white">
                          {formatAcsCount(cell)}
                        </td>
                        <td className="px-4 py-2 text-cool-light">
                          {formatAcsPercent(cell)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="text-h3 text-surface-white mt-8 mb-2">
                Detailed Asian groups
              </h3>
              <p className="text-sm text-cool-mid mb-3">
                Table B02015, Asian Alone by Selected Groups. This is a detailed table
                and publishes no percentage, so none is shown and none is derived here.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
                  <caption className="sr-only">
                    Counts for five South Asian groups in Loudoun County, with margins of
                    error.
                  </caption>
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Census group
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Count
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {southAsianGroups.map(([label, cell]) => (
                      <tr key={label} className="hover:bg-white/[0.04]">
                        <th scope="row" className="text-left px-4 py-2 font-normal text-cool-light">
                          {label}
                          <span className="block text-xs text-cool-mid font-mono mt-1">
                            {cell?.variable}
                          </span>
                        </th>
                        <td className="px-4 py-2 text-surface-white">
                          {formatAcsCount(cell)}
                        </td>
                        <td className="px-4 py-2 text-cool-mid text-xs">
                          {cell?.estimate_exceeds_margin
                            ? "The margin of error is larger than the estimate, so this count is not distinguishable from a substantially smaller one."
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-sm border border-teal-primary/30 bg-navy-mid p-4">
                <h3 className="text-sm font-semibold text-surface-white mb-2">
                  A Census category is not an ancestry group
                </h3>
                <p className="text-sm text-cool-light">
                  Asian Indian, Black, and Hispanic or Latino are{" "}
                  <strong className="text-surface-white">
                    Census self-identification categories
                  </strong>
                  : they record how people describe themselves. The studies summarised
                  below grouped their participants by{" "}
                  <strong className="text-surface-white">genetic ancestry</strong>, which
                  is a different construct, measured a different way, usually from
                  principal components of genotype data. The two do not map onto each
                  other one to one. A county share recorded in a Census category does not
                  establish the genetic-ancestry composition of the people counted in it,
                  and none of the figures on this page describes any individual resident.
                </p>
                <p className="text-sm text-cool-light mt-3">
                  This matters most for Hispanic and Latino populations, which are
                  admixed and sit on a continuum of genetic ancestry rather than forming a
                  discrete group. One study of a Los Angeles biobank found that score
                  accuracy varies continuously with genetic distance from a score&rsquo;s
                  training data, including within a single labelled group, and that the
                  closest tenth of its Hispanic Latino American cluster performed about as
                  well as the furthest tenth of its European-ancestry cluster
                  <InlineCitation id="ding2023" />. The authors of a type 2 diabetes score
                  evaluation give admixture among European, African and Indigenous
                  American ancestries as the reason their Hispanic or Latino accuracy
                  figure falls between their European and African ones
                  <InlineCitation id="ge2022" />. The National Academies published a 2023
                  consensus study report on the use of population descriptors in this
                  field <InlineCitation id="nasem2023" />.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-cool-mid italic">
              Census figures were not retrieved. Run{" "}
              <code>scripts/fetch_acs_loudoun.py</code> to populate this section.
            </p>
          )}
        </section>

        {/* ── 3. Who GWAS studied ── */}
        <section aria-labelledby="gwas-heading" id="who-gwas-studied" className={SECTION}>
          <h2 id="gwas-heading" className="text-h2 text-surface-white mb-3">
            Who GWAS has enrolled
          </h2>
          {gwas ? (
            <>
              <p className="text-sm text-cool-light mb-4">
                Share of genome-wide association study participants by ancestry group, from
                a single {gwas.asOf} snapshot. Source: {gwas.source}
                <InlineCitation id="mills2020" />. Denominator: {gwas.denominatorNote}.
              </p>
              <div className="rounded-sm border border-white/[0.06] bg-navy-mid p-5">
                <BarRows
                  rows={gwas.rows.map((r) => ({
                    label: `${r.group} ancestry`,
                    value: r.pct,
                    display: `${r.pct}%`,
                    emphasis: r.group !== "European",
                  }))}
                  max={100}
                  width={880}
                  barHeight={54}
                  gap={20}
                  labelWidth={230}
                  labelFontSize={16}
                  valueFontSize={19}
                  colors={PAGE_BARS}
                />
              </div>
              <p className="text-sm text-cool-mid mt-3">
                Two cautions on this chart. The snapshot itemises only these groups and
                does not break out the remainder, which is therefore not plotted rather
                than being zero. And{" "}
                <strong className="text-surface-white">
                  &ldquo;Asian&rdquo; here is not South Asian-specific
                </strong>
                : it combines East, South-East, South and Central Asian ancestries, so it
                cannot be read as a figure for South Asian participation.
              </p>

              <h3 className="text-h3 text-surface-white mt-8 mb-2">
                South Asian participation, itemised
              </h3>
              <p className="text-sm text-cool-light mb-3">
                Because the snapshot above does not separate South Asian ancestry, the
                table below gives the one verified source that does. It is a{" "}
                <strong className="text-surface-white">different source</strong> with a{" "}
                <strong className="text-surface-white">different denominator</strong>, so
                it is shown as a table rather than merged into the chart: the two sets of
                percentages are not interchangeable and must not be added together.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
                  <caption className="sr-only">
                    Share of GWAS participants by population descent, five groups, from a
                    2022 survey of the field.
                  </caption>
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Population descent
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Share of GWAS participants
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {fieldShare.map((r) => (
                      <tr key={r.group} className="hover:bg-white/[0.04]">
                        <th scope="row" className="text-left px-4 py-2 font-normal text-cool-light">
                          {r.group}
                        </th>
                        <td className="px-4 py-2 text-surface-white">{r.value}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-cool-mid mt-3">
                {citeShort(litById.get("fatumo2022"))}
                <InlineCitation id="fatumo2022" />. One earlier survey of the first decade
                of polygenic scoring studies found 67% included only European-ancestry
                participants, and 3.8% were conducted among African, Hispanic or
                Indigenous cohorts; it noted South Asian samples had been included in very
                few such studies <InlineCitation id="duncan2019" />.
              </p>
            </>
          ) : (
            <p className="text-sm text-cool-mid italic">
              The GWAS ancestry snapshot was not available at build time.
            </p>
          )}
        </section>

        {/* ── 4. Why accuracy drops ── */}
        <section aria-labelledby="mechanisms-heading" id="mechanisms" className={SECTION}>
          <h2 id="mechanisms-heading" className="text-h2 text-surface-white mb-3">
            Why accuracy drops across ancestry groups
          </h2>
          <p className="text-sm text-cool-light mb-4">
            Five quantities account for most of the measured loss, and the literature
            treats them separately. They are not interchangeable, and a score can be
            affected by several at once.
          </p>
          <ol className="space-y-4 text-sm text-cool-light list-decimal list-outside ml-5">
            <li>
              <strong className="text-surface-white">Discovery sample size.</strong> Score
              performance tracks the size of the genome-wide association study it was
              built from. In one multi-ancestry type 2 diabetes evaluation, single-ancestry
              score performance correlated positively with GWAS sample size across all five
              ancestry groups <InlineCitation id="huertachagoya2026" />, and in a large
              type 2 diabetes meta-analysis the groups with the smallest effective sample
              sizes produced the weakest ancestry-specific scores
              <InlineCitation id="mahajan2022" />.
            </li>
            <li>
              <strong className="text-surface-white">
                Linkage-disequilibrium differences.
              </strong>{" "}
              A score carries tag variants rather than the underlying functional ones. How
              well a tag stands in for its neighbour depends on local haplotype structure,
              which differs between populations <InlineCitation id="wang2020ra" />. Earlier
              work named the handling of linkage disequilibrium as a methodological
              requirement for applying scores to non-European cohorts
              <InlineCitation id="duncan2019" />.
            </li>
            <li>
              <strong className="text-surface-white">Allele-frequency differences.</strong>{" "}
              A variant common enough to detect in one population can be too rare to detect
              in another, and ancestry-specific variants tend to be rarer
              <InlineCitation id="mahajan2022" />. Averaged across traits, allele-frequency
              and linkage-disequilibrium differences together account for about 86% of the
              accuracy loss in African ancestry and about 37% in South Asian ancestry
              <InlineCitation id="wang2020ra" />, which leaves a substantial remainder in
              both.
            </li>
            <li>
              <strong className="text-surface-white">Effect heterogeneity.</strong> The
              cross-population correlation of effect sizes at the underlying functional
              variants, and the ratio of heritability between populations, both enter the
              accuracy ratio directly <InlineCitation id="wang2020ra" />. For type 2
              diabetes and asthma, association signals themselves appear mostly shared
              across groups <InlineCitation id="mahajan2022" />
              <InlineCitation id="tsuo2022" />, so for those traits this term is smaller
              than the tagging and frequency terms.
            </li>
            <li>
              <strong className="text-surface-white">
                Environment and gene-environment interaction.
              </strong>{" "}
              Reviews of transferability name modifiable risk factors alongside genetic
              ones <InlineCitation id="kachuri2024" />. Asthma score accuracy differed
              across biobanks in part through disease prevalence, environmental exposures
              and phenotype definition <InlineCitation id="tsuo2022" />. In blood-pressure
              score evaluations, stratified performance patterns were clearer in some
              self-reported background groups than others, which the authors read as a sign
              of environmental and gene-environment contributions
              <InlineCitation id="kurniansyah2023" />. Environment is not the whole story,
              though: when training and testing are confined to a single cohort, reducing
              environmental and genotyping confounding, accuracy still falls with genetic
              distance <InlineCitation id="prive2022" />.
            </li>
          </ol>
          <p className="text-sm text-cool-light mt-4">
            Underneath all five, accuracy varies continuously with genetic distance from the
            training data rather than stepping between labelled groups. Across 84 traits,
            genetic distance correlated with score accuracy at −0.95
            <InlineCitation id="ding2023" />.
          </p>
        </section>

        {/* ── 5. Module cards ── */}
        <section aria-labelledby="modules-heading" id="modules" className={SECTION}>
          <h2 id="modules-heading" className="text-h2 text-surface-white mb-3">
            Disease modules
          </h2>
          <p className="text-sm text-cool-light mb-5">
            One module per disease. The headline figure below is each module&rsquo;s South
            Asian-ancestry row, with its metric named. Metrics differ between modules and
            are <strong className="text-surface-white">not comparable across cards</strong>
            : each number is only meaningful against the comparator given beside it.
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {modules.map((m) => {
              const sa = m.groups.find((g) => g.population === "South Asian ancestry");
              const disease = getDisease(m.disease_slug);
              return (
                <div
                  key={m.slug}
                  className="rounded-sm border border-white/[0.06] bg-navy-mid p-5 flex flex-col"
                >
                  <h3 className="text-h3 text-surface-white mb-1">
                    {disease?.name ?? m.disease_slug}
                  </h3>
                  <p className="text-xs text-cool-mid mb-3">
                    South Asian ancestry, headline figure
                  </p>
                  {sa && sa.prs_transferability.value !== null ? (
                    <div className="mb-3">
                      <div className="text-2xl font-semibold text-teal-primary">
                        {sa.prs_transferability.value}
                      </div>
                      <div className="text-xs text-cool-light mt-1">
                        {sa.prs_transferability.metric}
                      </div>
                      <div className="text-xs text-cool-mid mt-1">
                        vs {sa.prs_transferability.comparator}
                      </div>
                      <div className="text-xs text-cool-mid mt-1">
                        Study: {citeShort(litById.get(sa.prs_transferability.study)) ||
                          sa.prs_transferability.study}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="text-lg font-semibold text-cool-mid italic">
                        Not quantified
                      </div>
                      <div className="text-xs text-cool-mid mt-1">
                        No verified source reports this metric for this group and trait.
                      </div>
                    </div>
                  )}
                  {sa && (
                    <div className="mb-3">
                      <ConfidenceBadge
                        tier={
                          sa.evidence_confidence === "high"
                            ? "HIGH"
                            : sa.evidence_confidence === "medium"
                              ? "MEDIUM"
                              : "LOW"
                        }
                      />
                    </div>
                  )}
                  <Link
                    href={`/atlas/diseases/${m.disease_slug}#cross-ancestry`}
                    className="mt-auto text-sm text-teal-primary hover:text-teal-soft hover:underline"
                  >
                    Full module, all three groups →
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-cool-mid mt-5">
            Hypertension and breast cancer were evaluated as a fourth module and excluded.
            Neither has a verified study reporting a transferability metric for a South
            Asian-ancestry group: the available blood-pressure evaluation groups
            participants by self-reported race and ethnicity, and its &ldquo;Asian&rdquo;
            category is not a South Asian-ancestry grouping
            <InlineCitation id="kurniansyah2023" />. Shipping it would have meant treating a
            self-identification category as an ancestry group, which the policy below
            forbids.
          </p>
        </section>

        {/* ── 6. PRS portability figure ── */}
        <section aria-labelledby="portability-heading" id="portability" className={SECTION}>
          <h2 id="portability-heading" className="text-h2 text-surface-white mb-3">
            One score, one metric, five groups
          </h2>
          {prs ? (
            <>
              <p className="text-sm text-cool-light mb-4">
                Every bar below is the{" "}
                <strong className="text-surface-white">same metric</strong>, the same trait
                ({prs.trait}), the same score and the same study, which is what makes them
                comparable with each other. Metric: {prs.metric}, the gain in area under
                the curve from adding the score to a model of age, sex and principal
                components. Higher is more accurate. Source:{" "}
                {citeShort(litById.get(prs.study))}
                <InlineCitation id="huertachagoya2026" />.
              </p>
              <div className="rounded-sm border border-white/[0.06] bg-navy-mid p-5">
                <BarRows
                  rows={prs.rows.map((r) => ({
                    label: r.population,
                    sublabel: `study label: ${r.labelAsUsed}`,
                    value: r.value,
                    display: r.value.toFixed(3),
                    emphasis: r.population === "European ancestry",
                  }))}
                  max={
                    Math.ceil((Math.max(...prs.rows.map((r) => r.value)) * 1.08) / 0.05) *
                    0.05
                  }
                  width={880}
                  barHeight={56}
                  gap={18}
                  labelWidth={330}
                  labelFontSize={15}
                  sublabelFontSize={12}
                  valueFontSize={19}
                  colors={PAGE_BARS}
                />
              </div>

              <h3 className="text-h3 text-surface-white mt-6 mb-2">Figure data</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-white/[0.06] rounded-sm overflow-hidden">
                  <caption className="sr-only">
                    Incremental AUC of one multi-ancestry type 2 diabetes polygenic score,
                    by ancestry group.
                  </caption>
                  <thead className="bg-white/[0.03]">
                    <tr>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Ancestry group
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Label used by the study
                      </th>
                      <th scope="col" className="text-left px-4 py-2 font-medium text-surface-white">
                        Incremental AUC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {prs.rows.map((r) => (
                      <tr key={r.population} className="hover:bg-white/[0.04]">
                        <th scope="row" className="text-left px-4 py-2 font-normal text-cool-light">
                          {r.population}
                        </th>
                        <td className="px-4 py-2 text-cool-mid">{r.labelAsUsed}</td>
                        <td className="px-4 py-2 text-surface-white">
                          {r.value.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-cool-mid mt-3">
                One honest complication, from the same paper: this multi-ancestry score
                significantly outperformed the best previously published score for the
                African or African American, Admixed American and European groups, but not
                for the East Asian or South Asian groups, where the best previously
                published South Asian score reached a slightly higher incremental AUC of
                0.068 <InlineCitation id="huertachagoya2026" />. A newer score is not
                automatically a better one for every group.
              </p>
            </>
          ) : (
            <p className="text-sm text-cool-mid italic">
              The portability figure was not available at build time.
            </p>
          )}
        </section>

        {/* ── 7. Brief #5 ── */}
        {brief && (
          <section aria-labelledby="brief-heading" id="brief" className={SECTION}>
            <h2 id="brief-heading" className="text-h2 text-surface-white mb-3">
              Mechanism brief
            </h2>
            <div className="rounded-sm border border-teal-primary/30 bg-navy-mid p-5">
              <h3 className="text-h3 text-surface-white mb-2">
                <Link
                  href={`/mechanism-briefs/${brief.slug}`}
                  className="text-teal-primary hover:text-teal-soft hover:underline"
                >
                  {brief.title}
                </Link>
              </h3>
              <p className="text-sm text-cool-light">{brief.question}</p>
            </div>
          </section>
        )}

        {/* ── 8. Methods and definitions ── */}
        <section aria-labelledby="methods-heading" id="methods" className={SECTION}>
          <h2 id="methods-heading" className="text-h2 text-surface-white mb-3">
            Methods and definitions
          </h2>

          <h3 className="text-h3 text-surface-white mt-4 mb-2">Relative accuracy</h3>
          <p className="text-sm text-cool-light">
            The relative accuracy of a polygenic score in an ancestry-divergent target
            population is the ratio of its prediction accuracy in that population to its
            prediction accuracy in a population of the same ancestry as the discovery
            sample: <code className="text-cool-mid">RA = R²₂ / R²₁</code>. Loss of accuracy
            is <code className="text-cool-mid">(1 − RA) × 100%</code>. Relative accuracy
            decomposes into the squared cross-population correlation of effect sizes at the
            underlying functional variants, the ratio of heritability between populations,
            and terms for allele-frequency and linkage-disequilibrium differences
            <InlineCitation id="wang2020ra" />. The definition and the decomposition are
            that paper&rsquo;s, not GENARCH&rsquo;s.
          </p>
          <p className="text-sm text-cool-light mt-3">
            Other metrics appear on these pages because the source studies used them:
            incremental AUC, variance explained on the liability scale, odds ratio per
            standard deviation, pseudo R², and relative effect size indexed to a reference
            group. These answer different questions and{" "}
            <strong className="text-surface-white">do not share a scale</strong>. Every
            value on every page is printed with its metric name beside it for that reason,
            and no chart here places two metrics on one axis.
          </p>

          <h3 className="text-h3 text-surface-white mt-6 mb-2">
            Population descriptors
          </h3>
          <ul className="space-y-2 text-sm text-cool-light list-disc list-outside ml-5">
            <li>
              <strong className="text-surface-white">
                &ldquo;South Asian ancestry&rdquo;, &ldquo;African ancestry&rdquo;,
                &ldquo;European ancestry&rdquo;
              </strong>{" "}
              refer to genetic-ancestry groupings as defined in the studies cited.
            </li>
            <li>
              <strong className="text-surface-white">
                &ldquo;Black&rdquo;, &ldquo;Hispanic or Latino&rdquo;, &ldquo;Asian
                Indian&rdquo;
              </strong>{" "}
              are Census self-identification categories and appear only beside Census
              figures.
            </li>
            <li>
              Hispanic and Latino populations are admixed and sit on a continuum of genetic
              ancestry rather than forming a discrete group
              <InlineCitation id="ding2023" />
              <InlineCitation id="ge2022" />. Where a study&rsquo;s own label spans both
              framings, GENARCH records the study&rsquo;s label verbatim in a
              &ldquo;study labels&rdquo; field beside its own, so the two can always be
              told apart.
            </li>
            <li>
              A Census category is never equated with a genetic-ancestry group in the same
              sentence without this caveat. The National Academies published a 2023
              consensus study report on population descriptors in this field
              <InlineCitation id="nasem2023" />.
            </li>
          </ul>

          <h3 className="text-h3 text-surface-white mt-6 mb-2">
            Verification of every number
          </h3>
          <p className="text-sm text-cool-light">
            Each reference behind these pages was checked against Crossref by DOI, with a
            normalised title match required, and each number was read from text actually
            retrieved: the Crossref abstract, the Europe PMC abstract, or the Europe PMC
            open-access full text. A page, table, or figure locator is recorded alongside
            every value in{" "}
            <code className="text-cool-mid">
              pipeline/sources/cross_ancestry/literature.json
            </code>
            , and the pipeline validator refuses to build a module whose value does not
            match its recorded extraction. Where a figure could not be located in retrieved
            text, it is omitted and the gap is stated rather than filled from another
            study. Loudoun population figures come from the Census Bureau API, with
            variables selected by matching the Bureau&rsquo;s own label text rather than by
            variable code.
          </p>

          <h3 className="text-h3 text-surface-white mt-6 mb-2">
            What GENARCH does not do
          </h3>
          <ul className="space-y-2 text-sm text-cool-light list-disc list-outside ml-5">
            <li>
              No polygenic score is computed, stored, or displayed for any person. There is
              no input on this site that accepts genetic data.
            </li>
            <li>
              No individual-level statement is made or implied. Every figure is a
              group-level statistic from a published study population.
            </li>
            <li>
              No clinical recommendation is made. GENARCH does not state whether a
              polygenic score should or should not be used in care; it reports what studies
              measured.
            </li>
            <li>
              No new analysis was performed. GENARCH ran no polygenic scoring and no
              reanalysis of any cohort, and claims no finding of its own: it synthesises
              published work.
            </li>
            <li>
              No causation is asserted. These are measurements of how a statistical model
              transfers between study populations.
            </li>
          </ul>
        </section>

        <EvidenceLimitations>
          <p className="mb-2">
            Accuracy metrics are not interchangeable. Incremental AUC, variance explained
            on the liability scale, odds ratio per standard deviation and relative accuracy
            answer different questions, and values from different studies or different
            metrics cannot be compared as though they shared a scale.
          </p>
          <p className="mb-2">
            Group labels are the ones each source study used, and they are not consistent
            between studies. The same label can describe differently sampled populations,
            and cohort setting, ascertainment, phenotype definition and environment are
            confounded with ancestry in any between-cohort comparison.
          </p>
          <p className="mb-2">
            No study cited here evaluated a polygenic score in a Loudoun County or Northern
            Virginia population. The published cohorts are UK Biobank, Genes &amp; Health,
            eMERGE, the Million Veteran Program, Biobank Japan, Taiwan Biobank, FinnGen,
            ATLAS and consortium member studies. Their settings differ from Loudoun&rsquo;s.
          </p>
          <p>
            Multi-ancestry scores narrow these gaps but do not close them, and a newer score
            is not better for every group. Where the verified literature measures nothing
            for a group, that gap is stated on the group&rsquo;s own row rather than left
            blank or filled by substitution.
          </p>
        </EvidenceLimitations>

        <CitationRenderer references={refs} />
      </article>
    </div>
  );
}
