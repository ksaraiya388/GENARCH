import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CiteBox } from "@/components/report/CiteBox";
import { DeqLimitation } from "@/components/report";
import { getAnnualReportByYear, getAnnualReports } from "@/lib/data";
import { authoredReportYears, reportContentFor } from "@/lib/report-content";
import { formatBytes, reportJsonLd, reportMetadata } from "@/lib/report-metadata";
import { apaCitation, bibtexCitation, isPending } from "@/content/reports/2026";

import "../report.css";

/**
 * Years that get a page.
 *
 * The union of the years with an authored body and the years with an `index.json`.
 * Restricting it to authored years would unpublish the 2024 entry, which renders from
 * its summary-level content and has a live URL.
 */
export async function generateStaticParams() {
  const years = new Set<string>([
    ...authoredReportYears(),
    ...getAnnualReports().map((r) => r.year),
  ]);
  return Array.from(years).map((year) => ({ year }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  const content = reportContentFor(year);
  const report = getAnnualReportByYear(year);
  if (!content) {
    return {
      title: `${report?.title ?? `Annual report ${year}`} | GENARCH`,
      description: report?.summary,
    };
  }
  return reportMetadata(content.frontmatter, report?.pdf_path ?? null);
}

export default async function AnnualReportPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const report = getAnnualReportByYear(year);
  const content = reportContentFor(year);
  if (!report && !content) notFound();

  // A year with an `index.json` but no authored body: the earlier, summary-level
  // rendering, kept so an existing URL keeps resolving.
  if (!content) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <article className="space-y-10">
          <Breadcrumbs
            items={[{ label: "Reports", href: "/reports/" }, { label: report!.title }]}
          />
          <header>
            <h1 className="text-h1 text-surface-white">{report!.title}</h1>
            {report!.summary && (
              <p className="mt-2 text-cool-light max-w-2xl">{report!.summary}</p>
            )}
          </header>
          {report!.content && (
            <div className="prose prose-sm max-w-none text-cool-light space-y-4">
              {report!.content.split("\n\n").map((block, i) => {
                const trimmed = block.trim();
                if (!trimmed) return null;
                if (trimmed.startsWith("## ")) {
                  return (
                    <h2 key={i} className="text-h2 text-surface-white mt-8 mb-3">
                      {trimmed.slice(3)}
                    </h2>
                  );
                }
                if (trimmed.startsWith("### ")) {
                  return (
                    <h3 key={i} className="text-h3 text-surface-white mt-4 mb-2">
                      {trimmed.slice(4)}
                    </h3>
                  );
                }
                return (
                  <p key={i} className="mb-3">
                    {trimmed}
                  </p>
                );
              })}
            </div>
          )}
          <Link
            href="/reports/"
            className="text-teal-primary hover:text-teal-soft hover:underline"
          >
            Back to reports
          </Link>
        </article>
      </div>
    );
  }

  const { frontmatter: fm, sections, Body } = content;
  const pdfPath = report?.pdf_path ?? null;
  const jsonLd = reportJsonLd(fm, pdfPath);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        // Serialised server-side from a literal object; no user input reaches it.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="report-article space-y-8">
        <Breadcrumbs
          items={[{ label: "Reports", href: "/reports/" }, { label: fm.shortTitle }]}
        />

        <header className="report-masthead">
          <h1 className="text-h1 text-surface-white">{fm.title}</h1>
          <p className="mt-3 text-sm text-cool-mid">
            Version {fm.version} · {fm.date} ·{" "}
            {isPending(fm.doi) ? "DOI pending" : `doi:${fm.doi}`} ·{" "}
            <span className="report-status">{fm.status}</span>
          </p>
          <p className="mt-3 flex flex-wrap gap-3 items-center">
            {pdfPath ? (
              <a href={pdfPath} className="btn-primary inline-block no-underline">
                Download PDF
                {report?.pdf_bytes ? ` (${formatBytes(report.pdf_bytes)})` : ""}
              </a>
            ) : (
              <span className="text-sm text-cool-mid">
                The PDF is published with the first identified version.
              </span>
            )}
            <Link
              href={`/reports/${year}/print/`}
              className="text-teal-primary hover:text-teal-soft hover:underline text-sm"
            >
              Print view
            </Link>
          </p>
          {pdfPath && report?.pdf_sha256 && (
            <p className="mt-2 text-xs text-cool-mid report-hash">
              SHA-256 {report.pdf_sha256}
            </p>
          )}
        </header>

        <DeqLimitation />

        <CiteBox apa={apaCitation()} bibtex={bibtexCitation()} />

        <nav aria-labelledby="toc-heading" className="report-toc">
          <h2 id="toc-heading" className="text-h3 text-surface-white">
            Contents
          </h2>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  {section.number ? `${section.number}. ` : ""}
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Body />
      </article>
    </div>
  );
}
