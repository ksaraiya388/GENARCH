import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";

export default function EthicsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs items={[{ label: "Ethics" }]} />

        <header>
          <h1 className="text-h1 text-surface-white">Ethics &amp; Responsible Use</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Ethical principles governing the GENARCH atlas.
          </p>
        </header>

        <section aria-labelledby="educational-intent-heading">
          <h2 id="educational-intent-heading" className="text-h2 text-surface-white mb-3">
            Educational Intent
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              GENARCH is an educational resource. All content is population-level
              and derived from publicly available, peer-reviewed data. The atlas
              synthesizes genetic epidemiology, environmental health, and molecular
              biology literature into an accessible knowledge graph for students,
              educators, researchers, and community members.
            </p>
            <p>
              No content on this site constitutes medical advice, diagnosis, or
              treatment recommendation. The atlas does not generate individual risk
              predictions or clinical decision support. Users seeking medical
              guidance should consult qualified healthcare professionals.
            </p>
          </div>
        </section>

        <section aria-labelledby="no-individual-risk-heading">
          <h2 id="no-individual-risk-heading" className="text-h2 text-surface-white mb-3">
            No Individual Risk
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              All visualizations, scores, and summaries describe population-level
              patterns of genetic architecture and environmental effect
              modification. Risk shift charts show relative changes across exposure
              strata at the population level &mdash; they do not predict outcomes
              for any individual.
            </p>
            <p>
              Polygenic risk score notes are provided for educational context only.
              GENARCH does not compute, display, or store individual PRS values.
              Strength scores (0&ndash;1) are composite indices for comparing
              evidence across associations, not measures of personal susceptibility.
            </p>
          </div>
        </section>

        <section aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="text-h2 text-surface-white mb-3">
            Privacy &amp; Data
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              GENARCH does not collect, store, or process any personally
              identifiable information (PII). There are no user accounts, logins,
              cookies tracking identity, or analytics tied to individuals.
            </p>
            <p>
              No personal genetic data (VCF, 23andMe, AncestryDNA, or any
              genotype format) is accepted, uploaded, or processed. The atlas
              operates entirely on published, aggregate population data.
            </p>
            <p>
              If analytics are used, they are privacy-preserving and
              aggregate-only (e.g., Vercel Web Analytics, which does not use
              cookies or track individual visitors).
            </p>
          </div>
        </section>

        <section aria-labelledby="ancestry-equity-heading">
          <h2 id="ancestry-equity-heading" className="text-h2 text-surface-white mb-3">
            Ancestry &amp; Equity
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              GWAS discovery cohorts remain predominantly European-ancestry
              (~85&ndash;90% of participants). This limits the transferability of
              genetic associations, polygenic risk scores, and
              gene&ndash;environment interaction estimates to non-European
              populations. Effect sizes, allele frequencies, and linkage
              disequilibrium patterns vary across ancestries.
            </p>
            <p>
              Every disease page includes a Population Equity Notes section
              documenting ancestry representation, transferability limitations,
              and known data gaps. Where multi-ancestry replication data exists
              (e.g., PAGE, TOPMed), it is cited alongside European-derived
              estimates.
            </p>
            <p>
              GENARCH does not make claims about genetic differences between
              racial or ethnic groups. Population-level genetic architecture data
              reflects study design biases, not biological hierarchies. Race is a
              social construct; ancestry is a genetic concept &mdash; both are
              handled with care throughout the atlas.
            </p>
          </div>
        </section>

        <section aria-labelledby="community-respect-heading">
          <h2 id="community-respect-heading" className="text-h2 text-surface-white mb-3">
            Community Respect
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              The Community Module presents environmental and health data using
              neutral, non-stigmatizing language. No community, census tract, or
              region is labeled as &ldquo;diseased,&rdquo;
              &ldquo;unhealthy,&rdquo; or &ldquo;at-risk&rdquo; in absolute
              terms. Instead, we use terms such as &ldquo;higher modeled
              burden&rdquo; and &ldquo;elevated exposure levels&rdquo; relative
              to regional or national baselines.
            </p>
            <p>
              All community-level estimates include uncertainty bounds and
              explicit limitations (ecological fallacy, data currency, spatial
              resolution). Socioeconomic data is framed as correlative context,
              not causal attribution, with explicit acknowledgment of structural
              determinants of health.
            </p>
          </div>
        </section>

        <section aria-labelledby="limitations-heading">
          <h2 id="limitations-heading" className="text-h2 text-surface-white mb-3">
            Limitations &amp; Uncertainty
          </h2>
          <div className="space-y-3 text-cool-light">
            <p>
              Mechanism briefs are hypothesis-driven syntheses, not validated
              causal models. They represent the current state of evidence and are
              subject to revision as new data emerges.
            </p>
            <p>
              Confidence ratings (low / medium / high) reflect evidence
              convergence across curated sources &mdash; they do not represent
              certainty. A &ldquo;high&rdquo; confidence rating means multiple
              independent evidence types converge, not that the association is
              proven.
            </p>
            <p>
              Strength scores are composite measures normalized to [0,&thinsp;1]
              and should not be interpreted as absolute effect sizes. They are
              designed for relative comparison across associations within the
              atlas, not for clinical or regulatory decision-making.
            </p>
            <p>
              All content is subject to the biases and limitations of the
              underlying data sources, including publication bias, cohort
              selection effects, and temporal gaps between data collection and
              atlas publication.
            </p>
          </div>
        </section>

        <EvidenceLimitations>
          <p className="mb-2">
            This page describes the ethical framework governing GENARCH. The
            atlas is for educational purposes only and does not constitute
            medical advice. No individual risk predictions, personal genetic
            data, or clinical recommendations are provided.
          </p>
          <p>
            For questions about the atlas methodology, see the{" "}
            <a href="/methods" className="text-teal-primary hover:text-teal-soft hover:underline">
              Methods
            </a>{" "}
            page. For data sources and scoring rules, see the strength scoring
            algorithm and confidence rating documentation.
          </p>
        </EvidenceLimitations>
      </article>
    </div>
  );
}
