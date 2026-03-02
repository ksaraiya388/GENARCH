import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getAllMechanismBriefs } from "@/lib/data";

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

export default function MechanismBriefsPage() {
  const briefs = getAllMechanismBriefs();

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Mechanism Briefs" },
        ]}
      />
      <header>
        <h1 className="text-h1 text-genarch-text">Mechanism Briefs</h1>
        <p className="mt-2 text-genarch-subtext max-w-2xl">
          In-depth mini-reviews explaining mechanistic hypotheses linking
          genetic architecture, environmental exposures, and disease. Population-level
          summaries for educational purposes only — do not imply individual risk.
        </p>
      </header>

      <section aria-labelledby="briefs-list-heading">
        <h2 id="briefs-list-heading" className="sr-only">
          Chronological list of mechanism briefs
        </h2>
        <div className="space-y-6">
          {briefs.map((brief) => {
            const summary =
              brief.background.length > 180
                ? brief.background.slice(0, 180) + "..."
                : brief.background;
            const tags: string[] = [];
            if (brief.related_disease) tags.push(brief.related_disease);
            if (brief.related_exposure) tags.push(brief.related_exposure);

            return (
              <Link
                key={brief.slug}
                href={`/mechanism-briefs/${brief.slug}`}
                className="card block no-underline transition-shadow hover:shadow-md"
              >
                <h3 className="text-h3 text-genarch-text mb-2">
                  {brief.title}
                </h3>
                <p className="text-sm text-genarch-subtext mb-4 line-clamp-2">
                  {summary}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <time
                    dateTime={brief.published_at}
                    className="text-genarch-subtext"
                  >
                    {formatDate(brief.published_at)}
                  </time>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="badge bg-genarch-data/30 text-genarch-text"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {briefs.length === 0 && (
          <p className="text-genarch-subtext italic">
            No mechanism briefs available yet.
          </p>
        )}
      </section>
    </div>
  );
}
