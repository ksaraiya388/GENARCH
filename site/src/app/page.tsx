import Link from "next/link";
import { getAllDiseases, getAllExposures, getAllGenes, getAllPathways } from "@/lib/data";

export default function HomePage() {
  const diseases = getAllDiseases();
  const exposures = getAllExposures();
  const genes = getAllGenes();
  const pathways = getAllPathways();

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="text-center py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-genarch-text mb-6 font-sans">
          Mapping Gene–Environment Interactions
        </h1>
        <p className="text-lg sm:text-xl text-genarch-subtext max-w-3xl mx-auto mb-8 font-body leading-relaxed">
          GENARCH is a public, interpretable scientific web atlas that links environmental
          exposures to genetic architecture and molecular mechanisms — providing
          population-level understanding of gene–environment interactions for community
          health education.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/atlas/diseases" className="btn-primary text-center no-underline">
            Explore the Atlas
          </Link>
          <Link href="/methods" className="btn-secondary text-center no-underline">
            Learn About GENARCH
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <section>
        <h2 className="text-center mb-10">Scientific Foundations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-genarch-primary/20 flex items-center justify-center">
              <span className="text-2xl">🧬</span>
            </div>
            <h3 className="mb-2">Genetic Epidemiology</h3>
            <p className="text-genarch-subtext text-sm">
              Curated GWAS, eQTL, and PRS data organized by disease, gene, and exposure
              with transparent scoring rules and ancestry representation tracking.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-genarch-data/30 flex items-center justify-center">
              <span className="text-2xl">🔬</span>
            </div>
            <h3 className="mb-2">Molecular Translation</h3>
            <p className="text-genarch-subtext text-sm">
              Tissue-resolved mechanistic hypotheses connecting statistical associations
              to biological pathways through curated mechanism briefs.
            </p>
          </div>
          <div className="card text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-genarch-community/30 flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
            <h3 className="mb-2">Community Health</h3>
            <p className="text-genarch-subtext text-sm">
              Hyper-local exposure and health burden overlays with interpretable models
              and educational resources for community partners.
            </p>
          </div>
        </div>
      </section>

      {/* Atlas overview */}
      <section>
        <h2 className="text-center mb-10">Atlas at a Glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/atlas/diseases" className="card text-center no-underline hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-genarch-primary">{diseases.length}</div>
            <div className="text-sm text-genarch-subtext mt-1">Diseases</div>
          </Link>
          <Link href="/atlas/exposures" className="card text-center no-underline hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-genarch-action">{exposures.length}</div>
            <div className="text-sm text-genarch-subtext mt-1">Exposures</div>
          </Link>
          <Link href="/atlas/genes-pathways" className="card text-center no-underline hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-genarch-data">{genes.length}</div>
            <div className="text-sm text-genarch-subtext mt-1">Genes</div>
          </Link>
          <Link href="/atlas/genes-pathways" className="card text-center no-underline hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-genarch-community">{pathways.length}</div>
            <div className="text-sm text-genarch-subtext mt-1">Pathways</div>
          </Link>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-center mb-10">Explore Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Knowledge Graph", href: "/graph", desc: "Interactive network of all entity relationships with filters and export.", color: "bg-genarch-data/20" },
            { title: "Mechanism Briefs", href: "/mechanism-briefs", desc: "In-depth mini-reviews explaining mechanistic hypotheses.", color: "bg-genarch-secondary/20" },
            { title: "Community Module", href: "/community", desc: "County-level exposure and health burden overlays with model explanations.", color: "bg-genarch-community/20" },
            { title: "Educational Passport", href: "/passport", desc: "Generate a personalized educational PDF summary — no data stored.", color: "bg-genarch-passport/30" },
            { title: "Methods & Ethics", href: "/methods", desc: "Scoring rules, data sources, pipeline architecture, and ethical framework.", color: "bg-gray-100" },
            { title: "Updates", href: "/updates", desc: "Versioned changelog and annual reports.", color: "bg-genarch-action/20" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`card no-underline hover:shadow-md transition-shadow ${item.color}`}>
              <h3 className="text-genarch-text mb-2">{item.title}</h3>
              <p className="text-genarch-subtext text-sm">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
