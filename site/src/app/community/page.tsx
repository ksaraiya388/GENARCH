import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getCommunityRegionSlugs, getCommunityRegion } from "@/lib/data";
import { CommunityRegionsList } from "@/components/CommunityRegionsList";

export default function CommunityPage() {
  const slugs = getCommunityRegionSlugs();
  const regionSummaries = slugs
    .map((slug) => {
      const r = getCommunityRegion(slug);
      if (!r) return null;
      return {
        slug,
        region_id: r.region_id,
        name: r.name,
        geo_level: r.geo_level,
        health_stats_count: r.health_stats?.length ?? 0,
        exposure_layers_count: r.exposure_layers?.length ?? 0,
        last_updated: r.last_updated ?? "",
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "Community Module" }]} />
        <header>
          <h1 className="text-h1 text-surface-white">Community Module</h1>
          <p className="mt-2 text-cool-light max-w-2xl">
            Hyper-local exposure and health burden overlays with interpretable
            models. Population-level estimates for educational purposes only.
          </p>
        </header>

        {/* Not a CommunityRegion: this page is built from the DEQ monitoring tables under
            pipeline/sources/ rather than from data/community/*.json, so it carries no
            health_stats or exposure_layers and cannot go through CommunityRegionsList. */}
        <section aria-labelledby="monitoring-heading">
          <h2 id="monitoring-heading" className="text-h2 text-surface-white mb-4">
            Monitoring Records
          </h2>
          <Link
            href="/community/data-center-alley/"
            className="block max-w-2xl no-underline rounded-lg border border-white/[0.08] bg-navy-mid/80 p-5 transition-all hover:border-teal-primary/30 hover:bg-navy-mid focus:outline-none focus:ring-2 focus:ring-teal-primary/50"
          >
            <h3 className="text-lg font-semibold text-surface-white mb-1">
              Data Center Corridor Air Monitoring
            </h3>
            <p className="text-sm text-cool-mid mb-4">
              Eastern Loudoun County, March to August 2026
            </p>
            <p className="text-sm text-cool-light">
              Virginia DEQ low-cost sensor and regulatory monitor measurements, with the
              agency&apos;s own limitation language, a reproduction of its collocation analysis,
              and a record-length comparison across sites. No health data.
            </p>
          </Link>
        </section>

        <CommunityRegionsList regions={regionSummaries} />
      </div>
    </div>
  );
}
