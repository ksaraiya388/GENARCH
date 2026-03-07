import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getReleases } from "@/lib/data";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function UpdatesPage() {
  const releases = getReleases();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Updates" }]} />
        <header>
          <h1 className="text-h1 text-surface-white">Updates & Changelog</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Versioned changelog and release notes. See annual reports for
            year-over-year summaries.
          </p>
        </header>

        <section aria-labelledby="releases-heading">
          <h2 id="releases-heading" className="text-h2 text-surface-white mb-4">
            Releases (reverse chronological)
          </h2>
          <div className="space-y-4">
            {releases.map((release) => (
              <Link
                key={release.slug}
                href={`/updates/${release.slug}/`}
                className="card block no-underline transition-shadow hover:shadow-md"
              >
                <h3 className="text-h3 text-surface-white mb-2">
                  {release.title}
                </h3>
                {release.summary && (
                  <p className="text-sm text-cool-light mb-2 line-clamp-2">
                    {release.summary}
                  </p>
                )}
                <time
                  dateTime={release.date}
                  className="text-xs text-cool-mid"
                >
                  {formatDate(release.date)}
                </time>
              </Link>
            ))}
          </div>
          {releases.length === 0 && (
            <p className="text-cool-light italic">
              No releases in changelog yet.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-h2 text-surface-white mb-3">Annual Reports</h2>
          <p className="text-cool-light">Coming soon!</p>
        </section>
      </div>
    </div>
  );
}
