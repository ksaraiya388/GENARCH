import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getReleaseBySlug,
  getReleases,
} from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export async function generateStaticParams() {
  const releases = getReleases();
  return releases.map((r) => ({ slug: r.slug }));
}

export default async function UpdateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const release = getReleaseBySlug(slug);
  if (!release) notFound();

  return (
    <article className="space-y-10">
      <Breadcrumbs
        items={[
          { label: "Updates", href: "/updates/" },
          { label: release.title },
        ]}
      />

      <header>
        <h1 className="text-h1 text-genarch-text">{release.title}</h1>
        <time
          dateTime={release.date}
          className="block text-genarch-subtext mt-2"
        >
          {formatDate(release.date)}
        </time>
      </header>

      {release.summary && (
        <p className="text-genarch-text text-lg">{release.summary}</p>
      )}

      {release.content && (
        <div className="prose prose-sm max-w-none text-genarch-text space-y-4">
          {release.content.split("\n\n").map((block, i) => {
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
            if (trimmed.startsWith("- ")) {
              const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
              return (
                <ul key={i} className="list-disc list-inside space-y-1">
                  {items.map((item, j) => (
                    <li key={j}>{item.slice(2)}</li>
                  ))}
                </ul>
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

      {release.pdf_url && (
        <a
          href={release.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block no-underline"
        >
          Download PDF
        </a>
      )}

      {!release.pdf_url && (
        <p className="text-sm text-genarch-subtext italic">
          PDF not available for this release.
        </p>
      )}

      <Link href="/updates/" className="text-genarch-link hover:underline">
        ← Back to Updates
      </Link>
    </article>
  );
}
