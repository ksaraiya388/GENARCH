import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAnnualReportByYear } from "@/lib/data";
import { authoredReportYears, reportContentFor } from "@/lib/report-content";
import { reportMetadata } from "@/lib/report-metadata";

import "../../report.css";
import "./print.css";

/**
 * Only years with an authored body get a print view. A summary-level entry has
 * nothing to print that its own page does not already show.
 */
export async function generateStaticParams() {
  return authoredReportYears().map((year) => ({ year }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  const content = reportContentFor(year);
  if (!content) return { title: "Print view | GENARCH", robots: { index: false } };
  const report = getAnnualReportByYear(year);
  return reportMetadata(content.frontmatter, report?.pdf_path ?? null, { print: true });
}

/**
 * The print rendering of the report, and the page the PDF is built from.
 *
 * It carries no navigation, no citation widget and no table of contents: the PDF gets
 * its outline from the heading structure and its page numbers from the footer
 * template, so an on-page contents list would duplicate the bookmarks and date itself
 * the moment the pagination changed. It is noindex, because it is the same document as
 * the report page and two indexed copies of one report compete with each other.
 */
export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const content = reportContentFor(year);
  if (!content) notFound();

  const { Body } = content;

  return (
    <div className="report-print-page" data-report-print={year}>
      <article className="report-article">
        <Body />
      </article>
    </div>
  );
}
