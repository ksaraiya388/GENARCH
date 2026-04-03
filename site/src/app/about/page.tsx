import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={[{ label: "About" }]} />

      <article className="space-y-10">
        <header>
          <h1 className="text-h1 text-surface-white">About GENARCH</h1>
          <p className="text-cool-mid text-sm mt-2">
            Genetic Epidemiology Network for At Risk Community Health
          </p>
        </header>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">What GENARCH Is</h2>
          <div className="text-sm text-cool-light space-y-3 leading-relaxed">
            <p>
              GENARCH is a read-only, population-level scientific atlas mapping
              gene–environment interactions for Loudoun County, Virginia. It
              visualizes how genetic susceptibility and environmental exposures
              converge at the molecular level — connecting GWAS-identified loci
              to biological pathways, tissue-resolved expression data, and
              local environmental conditions.
            </p>
            <p>
              Every data point in the atlas is curated from peer-reviewed
              literature, scored with transparent rules, and linked to its
              source citations. The atlas covers diseases, environmental
              exposures, genes and variants, biological pathways, and
              tissue-specific mechanisms.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">
            What GENARCH Is Not
          </h2>
          <div className="border border-[#C53030]/30 rounded-md p-5 bg-[#C53030]/[0.05] space-y-2 text-sm text-cool-light">
            <ul className="list-disc list-inside space-y-1">
              <li>Not a consumer health tool</li>
              <li>Not a risk calculator or clinical decision support system</li>
              <li>Not a diagnostic tool</li>
              <li>Does not accept personal genetic data (VCF, 23andMe, AncestryDNA, or any genotype format)</li>
              <li>Does not generate individual risk scores</li>
              <li>Does not store any user data, inputs, or identifiers</li>
            </ul>
            <p className="text-xs text-cool-dark pt-2 border-t border-white/[0.06]">
              All content is for educational purposes only. Nothing on this site
              constitutes medical advice.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">
            Geographic Focus: Loudoun County
          </h2>
          <div className="text-sm text-cool-light space-y-3 leading-relaxed">
            <p>
              GENARCH is hyperlocal by design. Loudoun County, Virginia is one
              of the fastest-growing and most demographically diverse counties
              in the United States, with a population that has shifted rapidly
              from rural to suburban over the past two decades.
            </p>
            <p>
              The county presents a compelling case study for gene–environment
              interaction research: the Route 28 industrial corridor and Dulles
              International Airport create spatially variable air pollution
              exposure gradients; the rapidly growing South Asian, East African,
              and Hispanic populations highlight the direct relevance of
              GWAS transferability gaps; and the suburban-rural transition zones
              create natural variation in food access, greenspace, and
              psychosocial stressors.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">Data Sources</h2>
          <ul className="list-disc list-inside text-sm text-cool-light space-y-1">
            <li>GWAS Catalog — genome-wide association study results</li>
            <li>GTEx Portal (v8) — tissue-specific gene expression data</li>
            <li>CDC PLACES — county-level health prevalence estimates</li>
            <li>EPA AQS / AirNow — air quality monitoring data</li>
            <li>USDA Food Access Research Atlas — food desert mapping</li>
            <li>Peer-reviewed literature — mechanistic studies, meta-analyses, reviews</li>
          </ul>
        </section>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">Builder</h2>
          <p className="text-sm text-cool-light leading-relaxed">
            GENARCH was built by Kiaan Saraiya as an independent research
            project. The atlas integrates publicly available genomic,
            environmental, and health data into a unified, navigable knowledge
            graph designed for educational exploration.
          </p>
        </section>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">Academic Intent</h2>
          <p className="text-sm text-cool-light leading-relaxed">
            GENARCH is designed for researchers, educators, and students
            exploring gene–environment interaction science. It is not intended
            for clinical or commercial use. The atlas prioritizes scientific
            rigor, citation traceability, and transparent methodology over
            user engagement or consumer appeal.
          </p>
          <div className="mt-4">
            <Link href="/methods" className="btn-secondary text-sm">
              View Full Methodology
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
