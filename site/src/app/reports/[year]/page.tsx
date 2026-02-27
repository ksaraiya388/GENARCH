import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAnnualReportByYear,
  getAnnualReports,
} from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export async function generateStaticParams() {
  const reports = getAnnualReports();
  return reports.map((r) => ({ year: r.year }));
}

export default async function AnnualReportPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const report = getAnnualReportByYear(year);
  if (!report) notFound();

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: "Reports", href: "/updates/" },
          { label: report.title },
        ]}
      />

      <header>
        <h1 className="text-h1 text-genarch-text">{report.title}</h1>
        {report.summary && (
          <p className="mt-2 text-genarch-subtext max-w-2xl">
            {report.summary}
          </p>
        )}
      </header>

      {report.content && (
        <div className="prose prose-sm max-w-none text-genarch-text space-y-4">
          {report.content.split("\n\n").map((block, i) => {
            const trimmed = block.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith("## ")) {
              return (
                <h2 key={i} className="text-h2 text-genarch-text mt-8 mb-3">
                  {trimmed.slice(3)}
                </h2>
              );
            }
            if (trimmed.startsWith("### ")) {
              return (
                <h3 key={i} className="text-h3 text-genarch-text mt-4 mb-2">
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

      {report.pdf_path && (
        <a
          href={report.pdf_path}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block no-underline"
        >
          Download PDF
        </a>
      )}

      <Link href="/updates/" className="text-genarch-link hover:underline">
        ← Back to Updates
      </Link>
    </article>
  );
}
