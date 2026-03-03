import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function EthicsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs
          items={[
            { label: "Methods", href: "/methods/" },
            { label: "Ethics" },
          ]}
        />

        <header>
          <h1 className="text-h1 text-surface-white">Ethics Framework</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Ethical principles guiding the GENARCH atlas design and deployment.
          </p>
        </header>

        <section aria-labelledby="principles-heading">
          <h2 id="principles-heading" className="text-h2 text-surface-white mb-3">
            Core Principles
          </h2>
          <ul className="list-disc list-inside space-y-2 text-cool-light">
            <li>Population-level focus — never imply individual risk</li>
            <li>Transparency in data sources, ancestry representation, and limitations</li>
            <li>Educational intent — support community health literacy</li>
            <li>Avoid harm through careful framing and disclaimers</li>
          </ul>
        </section>

        <section aria-labelledby="data-equity-heading">
          <h2 id="data-equity-heading" className="text-h2 text-surface-white mb-3">
            Data Equity
          </h2>
          <p className="text-cool-light">
            GWAS and genetic epidemiology data historically over-represent European
            ancestry. We document ancestry composition and transferability gaps.
            Community models acknowledge geographic and demographic limitations.
          </p>
        </section>

        <Link href="/methods/" className="text-teal-primary hover:text-teal-soft hover:underline">
          ← Back to Methods
        </Link>
      </article>
    </div>
  );
}
