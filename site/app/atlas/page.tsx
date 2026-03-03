import Link from "next/link";

const modules = [
  {
    title: "Diseases",
    href: "/atlas/diseases",
    color: "bg-atlas/20",
    description: "Browse disease-level summaries, genetic architecture, and exposure modifiers."
  },
  {
    title: "Exposures",
    href: "/atlas/exposures",
    color: "bg-neutralPanel/30",
    description: "Explore environmental exposures, biological systems, and sensitive developmental windows."
  },
  {
    title: "Genes & Pathways",
    href: "/atlas/genes-pathways",
    color: "bg-graph/30",
    description: "Inspect molecular function, pathway context, and disease/exposure links."
  }
];

export default function AtlasIndexPage(): JSX.Element {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Atlas Index</h1>
        <p className="mt-2 text-textSecondary">
          Navigate the GENARCH atlas by disease, exposure, or molecular entry points.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className={`content-card no-underline ${module.color}`}>
            <h2 className="section-title">{module.title}</h2>
            <p className="mt-2 text-sm text-textSecondary">{module.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
