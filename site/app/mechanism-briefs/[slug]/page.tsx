import Link from "next/link";
import { notFound } from "next/navigation";

import { EvidenceLimitations } from "@/components/common/EvidenceLimitations";
import { loadBriefBySlug, listBriefSlugs } from "@/lib/mdx";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await listBriefSlugs();
  return slugs.map((slug) => ({ slug }));
}

const toc = [
  { id: "question", label: "Question" },
  { id: "evidence-summary", label: "Evidence summary" },
  { id: "mechanistic-chain", label: "Mechanistic chain" },
  { id: "tissue-specificity", label: "Tissue specificity" },
  { id: "counterarguments-and-limitations", label: "Limitations" },
  { id: "what-would-validate-this", label: "Validation ideas" },
  { id: "references", label: "References" }
];

export default async function MechanismBriefPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const brief = await loadBriefBySlug(params.slug);
  if (!brief) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="content-card h-fit">
        <h2 className="section-title">On this page</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {toc.map((item) => (
            <li key={item.id}>
              <Link href={`#${item.id}`}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </aside>
      <article className="space-y-6">
        <section className="content-card">
          <h1 className="text-3xl font-bold">{brief.frontmatter.title}</h1>
          <p className="mt-2 text-sm text-textSecondary">{brief.frontmatter.summary}</p>
          <p className="mt-1 text-xs text-textSecondary">
            {brief.frontmatter.date} • disease:{" "}
            <Link href={`/atlas/diseases/${brief.frontmatter.disease}`}>{brief.frontmatter.disease}</Link> •
            exposure:{" "}
            <Link href={`/atlas/exposures/${brief.frontmatter.exposure}`}>{brief.frontmatter.exposure}</Link>
          </p>
        </section>
        <section className="content-card prose prose-slate max-w-none prose-headings:scroll-mt-24">
          {brief.content}
        </section>
        <EvidenceLimitations />
      </article>
    </div>
  );
}
