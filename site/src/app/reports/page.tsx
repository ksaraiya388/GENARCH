import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getAnnualReports } from "@/lib/data";
import { reportContentFor } from "@/lib/report-content";
import { isPending } from "@/content/reports/2026";

import "./report.css";

export const metadata: Metadata = {
  title: "Reports | GENARCH",
  description:
    "Annual reports on the GENARCH atlas and on the monitoring data it reprocesses for " +
    "Loudoun County, Virginia.",
};

/**
 * The reports index.
 *
 * A report whose identifier is still pending is listed but not linked. The rule is
 * that such a report is reachable only by someone who already has its address, so it
 * cannot be indexed through this page or arrived at by a reader who would then cite a
 * version that has no identifier. Listing it anyway, with its status, is the honest
 * half: the work exists and this page says so.
 */
export default function ReportsIndexPage() {
  const reports = getAnnualReports();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Reports" }]} />

        <header>
          <h1 className="text-h1 text-surface-white">Reports</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Each annual report states what the atlas contained at a fixed date, how it was
            built, and what an independent recomputation of the published monitoring data
            for Loudoun County shows. All of it is population-level. None of it is medical
            advice or a diagnostic tool.
          </p>
        </header>

        <ul className="space-y-6">
          {reports.map((report) => {
            const content = reportContentFor(report.year);
            const fm = content?.frontmatter;
            const linked = fm ? !isPending(fm.doi) : true;
            const href = `/reports/${report.year}/`;
            const title = fm?.title ?? report.title;

            return (
              <li
                key={report.year}
                className="border border-navy-light rounded-lg p-5 bg-navy-mid"
              >
                <h2 className="text-h3 text-surface-white">
                  {linked ? (
                    <Link
                      href={href}
                      className="text-teal-primary hover:text-teal-soft hover:underline"
                    >
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </h2>
                <p className="mt-2 text-sm text-cool-mid">
                  {fm ? (
                    <>
                      Version {fm.version} · {fm.date} · {fm.status} ·{" "}
                      {isPending(fm.doi) ? "DOI pending" : `doi:${fm.doi}`}
                    </>
                  ) : (
                    <>Year {report.year}</>
                  )}
                </p>
                {report.summary && (
                  <p className="mt-3 text-cool-light">{report.summary}</p>
                )}
                {!linked && (
                  <p className="mt-3 text-sm text-cool-mid">
                    This report is not yet linked or indexed. It is published once its DOI
                    is issued, so that a citation made from it resolves.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
