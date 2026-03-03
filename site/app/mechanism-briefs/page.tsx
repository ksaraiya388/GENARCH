import Link from "next/link";

import { type MdxFrontmatter, loadBriefBySlug, listBriefSlugs } from "@/lib/mdx";

export default async function MechanismBriefsIndexPage(): Promise<JSX.Element> {
  const slugs = await listBriefSlugs();
  const briefs: MdxFrontmatter[] = (
    await Promise.all(
      slugs.map(async (slug) => {
        const brief = await loadBriefBySlug(slug);
        return brief ? brief.frontmatter : null;
      })
    )
  ).filter((item): item is MdxFrontmatter => item !== null);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Mechanism Briefs</h1>
        <p className="mt-2 text-textSecondary">
          Structured mini-reviews that connect exposure, genetic architecture, pathways, and tissue biology.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {briefs.map((brief) => (
          <Link
            href={`/mechanism-briefs/${brief.slug}`}
            key={brief.slug}
            className="content-card no-underline hover:-translate-y-0.5 transition-transform"
          >
            <h2 className="section-title">{brief.title}</h2>
            <p className="mt-2 text-sm text-textSecondary">{brief.summary}</p>
            <p className="mt-2 text-xs text-textSecondary">
              {brief.date} • disease: {brief.disease} • exposure: {brief.exposure}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
