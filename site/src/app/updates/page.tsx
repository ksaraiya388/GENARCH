import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getReleases, getAnnualReports } from "@/lib/data";

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
  const annualReports = getAnnualReports();

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Updates" }]} />
      <header>
        <h1 className="text-h1 text-genarch-text">Updates & Changelog</h1>
        <p className="mt-2 text-genarch-subtext max-w-2xl">
          Versioned changelog and release notes. See annual reports for
          year-over-year summaries.
        </p>
      </header>

      <section aria-labelledby="releases-heading">
        <h2 id="releases-heading" className="text-h2 text-genarch-text mb-4">
          Releases (reverse chronological)
        </h2>
        <div className="space-y-4">
          {releases.map((release) => (
            <Link
              key={release.slug}
              href={`/updates/${release.slug}/`}
              className="card block no-underline transition-shadow hover:shadow-md"
            >
              <h3 className="text-h3 text-genarch-text mb-2">
                {release.title}
              </h3>
              {release.summary && (
                <p className="text-sm text-genarch-subtext mb-2 line-clamp-2">
                  {release.summary}
                </p>
              )}
              <time
                dateTime={release.date}
                className="text-xs text-genarch-subtext"
              >
                {formatDate(release.date)}
              </time>
            </Link>
          ))}
        </div>
        {releases.length === 0 && (
          <p className="text-genarch-subtext italic">
            No releases in changelog yet.
          </p>
        )}
      </section>

      {annualReports.length > 0 && (
        <section>
          <h2 className="text-h2 text-genarch-text mb-3">Annual Reports</h2>
          <ul className="space-y-2">
            {annualReports.map((r) => (
              <li key={r.year}>
                <Link
                  href={`/reports/${r.year}/`}
                  className="text-genarch-link hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
