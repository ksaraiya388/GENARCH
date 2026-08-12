import { notFound } from "next/navigation";
import { getCommunityRegion, getCommunityRegionSlugs } from "@/lib/data";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EvidenceLimitations } from "@/components/EvidenceLimitations";
import Link from "next/link";
import { CommunityRegionDetail } from "@/components/CommunityRegionDetail";

/**
 * Locale, options AND timeZone are pinned, and must stay identical to
 * CommunityRegionsList.formatRegionDate, so /community and /community/[region] can never
 * render the same field two different ways.
 *
 * Two distinct bugs are being closed here. A bare toLocaleDateString() took the build
 * machine's default locale. And `new Date("2026-07-22")` parses a date-only string as UTC
 * midnight, so formatting it in the machine's local zone renders the PREVIOUS day anywhere
 * west of UTC — "2026-07-22" displayed as "Jul 21, 2026" on an America/New_York builder.
 * timeZone: "UTC" pins the calendar date to the one written in the data.
 */
function formatRegionDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
      });
}

export async function generateStaticParams() {
  const slugs = getCommunityRegionSlugs();
  return slugs.map((region) => ({ region }));
}

export default async function CommunityRegionPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const data = getCommunityRegion(region);
  if (!data) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <article className="space-y-10">
        <Breadcrumbs
          items={[
            { label: "Community Module", href: "/community/" },
            { label: data.name },
          ]}
        />

        <header>
          <h1 className="text-h1 text-surface-white">{data.name}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-cool-mid mt-2">
            <span className="capitalize">Geo level: {data.geo_level}</span>
            {data.fips_code && <span>FIPS: {data.fips_code}</span>}
            {formatRegionDate(data.last_updated) && (
              <span>Last update: {formatRegionDate(data.last_updated)}</span>
            )}
          </div>
        </header>

        <CommunityRegionDetail region={data} />

        <EvidenceLimitations>
          {/* Lives in the template, not in per-region JSON, so it cannot be omitted for a
              region. Rule 6 (ecological fallacy) is a distinct inferential error from Rule 5
              (individual risk) and must be disclosed separately. */}
          <p className="mb-2">
            These are aggregate county-level figures. Associations observed between
            county-level exposure and county-level prevalence do not establish that
            exposed individuals within the county are the affected individuals — this
            is the ecological fallacy.
          </p>
          <p className="mb-2">
            Community estimates are population-level and do not imply individual
            risk. Model outputs have uncertainty; see model card for details.
          </p>
          <p>{data.limitations}</p>
        </EvidenceLimitations>
      </article>
    </div>
  );
}
