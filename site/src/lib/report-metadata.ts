import type { Metadata } from "next";

import { absoluteUrl } from "./site";
import type { ReportFrontmatter } from "@/content/reports/2026";

const PENDING = "PENDING";

function pending(value: string | undefined | null): boolean {
  return !value || value.trim().toUpperCase() === PENDING;
}

/**
 * Highwire Press bibliographic tags for a report page.
 *
 * Google Scholar, Zotero and most reference managers read these; they are the reason a
 * reader can cite the report by dropping its URL into a manager rather than retyping
 * the cover. A tag whose value is still pending is omitted rather than emitted with
 * the literal text, because a manager that ingests "PENDING" as a DOI stores a
 * reference that will never resolve and will not be corrected later.
 */
export function highwireTags(
  fm: ReportFrontmatter,
  pdfPath: string | null
): Record<string, string> {
  const tags: Record<string, string> = {
    citation_title: fm.title,
    citation_author: fm.author.name,
    citation_publication_date: fm.date.replace(/-/g, "/"),
    citation_technical_report_institution: "GENARCH",
  };
  if (!pending(fm.doi)) tags.citation_doi = fm.doi;
  if (pdfPath) tags.citation_pdf_url = absoluteUrl(pdfPath);
  return tags;
}

/**
 * JSON-LD for the report, as a schema.org Report.
 *
 * `isBasedOn` points at the software release the report was produced from, which is
 * the machine-readable form of the claim the reproducibility appendix makes in prose.
 * As with the tags above, a pending identifier is left out rather than published.
 */
export function reportJsonLd(
  fm: ReportFrontmatter,
  pdfPath: string | null
): Record<string, unknown> {
  const canonical = absoluteUrl(`/reports/${fm.year}/`);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Report",
    name: fm.title,
    headline: fm.shortTitle,
    url: canonical,
    datePublished: fm.date,
    version: fm.version,
    inLanguage: "en-US",
    license: fm.licenseUrl,
    creativeWorkStatus: fm.status,
    author: {
      "@type": "Person",
      name: fm.author.name,
      identifier: `https://orcid.org/${fm.author.orcid}`,
      affiliation: { "@type": "Organization", name: fm.author.affiliation },
    },
    publisher: { "@type": "Organization", name: "GENARCH", url: absoluteUrl("/") },
  };
  jsonLd.identifier = pending(fm.doi) ? canonical : `https://doi.org/${fm.doi}`;
  if (!pending(fm.softwareDoi)) {
    jsonLd.isBasedOn = {
      "@type": "SoftwareSourceCode",
      identifier: `https://doi.org/${fm.softwareDoi}`,
      name: "GENARCH pipeline and atlas",
    };
  }
  if (pdfPath) {
    jsonLd.encoding = {
      "@type": "MediaObject",
      encodingFormat: "application/pdf",
      contentUrl: absoluteUrl(pdfPath),
    };
  }
  return jsonLd;
}

/**
 * Page metadata for a report year.
 *
 * `noindex, nofollow` while the report identifier is pending, and the report is linked
 * from nowhere in that state. A citable document that is indexed before it has an
 * identifier leaves search results pointing at a version nobody can cite by the
 * identifier it later acquires.
 */
export function reportMetadata(
  fm: ReportFrontmatter,
  pdfPath: string | null,
  options: { print?: boolean } = {}
): Metadata {
  const citable = !pending(fm.doi);
  const suffix = options.print ? " | Print view" : "";
  return {
    title: `${fm.shortTitle}${suffix} | GENARCH`,
    description:
      "Atlas scope, methods, and an independent reprocessing of Virginia DEQ Data " +
      "Center Air Monitoring Project sensor data for Loudoun County, Virginia. " +
      "Population-level and not peer reviewed.",
    alternates: { canonical: absoluteUrl(`/reports/${fm.year}/`) },
    robots: options.print
      ? { index: false, follow: false }
      : { index: citable, follow: citable },
    other: options.print ? undefined : highwireTags(fm, pdfPath),
  };
}

/** Bytes rendered as a readable size for the download link. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} kB`;
}
