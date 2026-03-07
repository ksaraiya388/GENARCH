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

        <CommunityRegionsList regions={regionSummaries} />
      </div>
    </div>
  );
}
