import Link from "next/link";
import { notFound } from "next/navigation";

import { getReleases } from "@/lib/data";
import { loadReportBySlug } from "@/lib/mdx";

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const releases = await getReleases();
  return releases.releases.map((release) => ({ slug: release.slug }));
}

export default async function UpdateReportPage({
  params
}: {
  params: { slug: string };
}): Promise<JSX.Element> {
  const releases = await getReleases();
  const release = releases.releases.find((entry) => entry.slug === params.slug);
  if (!release) notFound();

  const report = await loadReportBySlug(params.slug);

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h1 className="text-3xl font-bold">{release.title}</h1>
        <p className="mt-2 text-sm text-textSecondary">{release.date}</p>
        <p className="mt-3 text-textSecondary">{release.summary}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href={release.pdf_path}
            className="rounded bg-action px-3 py-2 font-semibold text-white no-underline"
            target="_blank"
            rel="noreferrer"
          >
            Download PDF
          </a>
          <Link href="/updates">Back to updates</Link>
        </div>
      </section>

      <section className="content-card prose prose-slate max-w-none">
        {report ? report.content : <p>No MDX report content available for this release.</p>}
      </section>
    </div>
  );
}
