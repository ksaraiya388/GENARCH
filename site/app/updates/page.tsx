import Link from "next/link";

import { getReleases } from "@/lib/data";

export default async function UpdatesPage(): Promise<JSX.Element> {
  const releases = await getReleases();
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Updates</h1>
        <p className="mt-2 text-textSecondary">
          Reverse-chronological changelog of reports, data updates, and feature improvements.
        </p>
      </section>
      <section className="space-y-3">
        {releases.releases.map((release) => (
          <article key={release.slug} className="content-card">
            <p className="text-xs uppercase tracking-wide text-textSecondary">{release.date}</p>
            <h2 className="mt-1 text-xl font-semibold text-textPrimary">{release.title}</h2>
            <p className="mt-2 text-sm text-textSecondary">{release.summary}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href={`/updates/${release.slug}`}>Open report page</Link>
              <a href={release.pdf_path} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
