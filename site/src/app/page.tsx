import Link from "next/link";
import Image from "next/image";
import { getAllDiseases, getAllExposures, getAllGenes, getAllPathways } from "@/lib/data";

const PILLAR_ICONS = {
  architecture: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#1FAFA0" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="16" cy="8" r="3"/><circle cx="8" cy="24" r="3"/><circle cx="24" cy="24" r="3"/>
      <line x1="16" y1="11" x2="8" y2="21"/><line x1="16" y1="11" x2="24" y2="21"/><line x1="8" y1="24" x2="24" y2="24"/>
    </svg>
  ),
  environment: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#1FAFA0" strokeWidth="1.5" strokeLinecap="round">
      <path d="M16 28V12"/><path d="M8 20c0-6 8-14 8-14s8 8 8 14c0 4-3.6 8-8 8s-8-4-8-8z"/>
    </svg>
  ),
  interaction: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#1FAFA0" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="10" cy="10" r="4"/><circle cx="22" cy="22" r="4"/><path d="M13 13l6 6"/><circle cx="24" cy="8" r="2.5"/><circle cx="8" cy="24" r="2.5"/>
      <line x1="12" y1="8" x2="22" y2="8" opacity="0.4"/><line x1="10" y1="14" x2="8" y2="22" opacity="0.4"/>
    </svg>
  ),
};

export default function HomePage() {
  const diseases = getAllDiseases();
  const exposures = getAllExposures();
  const genes = getAllGenes();
  const pathways = getAllPathways();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "#0B1F2F" }}>
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "url('/network-pattern.svg')", backgroundRepeat: "no-repeat", backgroundPosition: "top right", backgroundSize: "60%" }}
          aria-hidden="true"
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="animate-fade-in">
            <Image
              src="/GENARCH_LOGO.svg"
              alt="GENARCH"
              width={380}
              height={58}
              className="mx-auto mb-8"
              style={{ width: "clamp(260px, 50vw, 420px)", height: "auto" }}
              priority
            />
          </div>
          <p className="animate-slide-up text-lg sm:text-xl text-cool-light font-medium mb-3">
            A Systems-Level Genetic Epidemiology Atlas
          </p>
          <p className="animate-slide-up text-sm sm:text-base text-cool-mid max-w-2xl mx-auto mb-10 leading-relaxed">
            Mapping gene–environment interactions, exposure modifiers, and
            molecular mechanisms across diseases, pathways, and tissues at
            population scale.
          </p>
          <div className="animate-slide-up flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/atlas/diseases" className="btn-primary">
              Explore the Atlas
            </Link>
            <Link href="/methods" className="btn-secondary">
              Learn About GENARCH
            </Link>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="section-alt py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-surface-white mb-12">Scientific Foundations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: PILLAR_ICONS.architecture, title: "Genetic Architecture", desc: "Curated GWAS, eQTL, and polygenic risk data organized by disease, gene, and tissue with transparent scoring rules and ancestry representation tracking." },
              { icon: PILLAR_ICONS.environment, title: "Environmental Modifiers", desc: "Exposure characterization from air pollution to psychosocial stress, with dose-response patterns, sensitive windows, and population-level effect modification." },
              { icon: PILLAR_ICONS.interaction, title: "Gene–Environment Interaction", desc: "Tissue-resolved mechanistic hypotheses connecting statistical associations to biological pathways through curated mechanism briefs and network analysis." },
            ].map((p) => (
              <div key={p.title} className="card text-center group">
                <div className="w-16 h-16 mx-auto mb-5 rounded-xl flex items-center justify-center bg-teal-primary/[0.08] group-hover:bg-teal-primary/[0.12] transition-colors">
                  {p.icon}
                </div>
                <h3 className="text-surface-white mb-2">{p.title}</h3>
                <p className="text-cool-mid text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Atlas Stats */}
      <section className="py-20" style={{ backgroundColor: "#0B1F2F" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-surface-white mb-12">Atlas at a Glance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { count: diseases.length, label: "Diseases", href: "/atlas/diseases" },
              { count: exposures.length, label: "Exposures", href: "/atlas/exposures" },
              { count: genes.length, label: "Genes", href: "/atlas/genes-pathways" },
              { count: pathways.length, label: "Pathways", href: "/atlas/genes-pathways" },
            ].map((s) => (
              <Link key={s.label} href={s.href} className="card text-center no-underline hover:no-underline group">
                <div className="text-3xl font-bold text-teal-primary group-hover:text-teal-soft transition-colors">{s.count}</div>
                <div className="text-sm text-cool-mid mt-1">{s.label}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Disease Modules Preview */}
      <section className="section-alt py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-surface-white mb-4">Disease Modules</h2>
          <p className="text-center text-cool-mid text-sm mb-12 max-w-xl mx-auto">
            Each module maps genetic architecture, environmental drivers, and
            gene–environment interactions for a specific condition.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {diseases.slice(0, 12).map((d) => (
              <Link
                key={d.slug}
                href={`/atlas/diseases/${d.slug}`}
                className="card no-underline hover:no-underline group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-teal-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-surface-white text-base font-semibold mb-2">{d.name}</h3>
                <p className="text-cool-mid text-xs leading-relaxed line-clamp-3 mb-3">
                  {d.summary.slice(0, 120)}...
                </p>
                <span className="text-teal-primary text-xs font-medium group-hover:text-teal-soft transition-colors">
                  View Module →
                </span>
              </Link>
            ))}
          </div>
          {diseases.length > 12 && (
            <div className="text-center mt-8">
              <Link href="/atlas/diseases" className="btn-secondary text-sm">
                View All {diseases.length} Diseases
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Explore Modules */}
      <section className="py-20" style={{ backgroundColor: "#0B1F2F" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-surface-white mb-12">Explore Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "Knowledge Graph", href: "/graph", desc: "Interactive network of entity relationships with filters, side panels, and subgraph export." },
              { title: "Mechanism Briefs", href: "/mechanism-briefs", desc: "In-depth mini-reviews explaining mechanistic hypotheses linking exposures to disease." },
              { title: "Community Module", href: "/community", desc: "County-level exposure and health burden overlays with interpretable model explanations." },
              { title: "Educational Passport", href: "/passport", desc: "Generate a personalized educational summary PDF. Completely stateless — no data stored." },
              { title: "Methods & Ethics", href: "/methods", desc: "Scoring rules, data sources, pipeline architecture, ethical framework, and model cards." },
              { title: "Updates", href: "/updates", desc: "Versioned changelog and annual reports tracking atlas evolution over time." },
            ].map((m) => (
              <Link key={m.href} href={m.href} className="card no-underline hover:no-underline group">
                <h3 className="text-surface-white mb-2 group-hover:text-teal-primary transition-colors">{m.title}</h3>
                <p className="text-cool-mid text-sm leading-relaxed">{m.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
