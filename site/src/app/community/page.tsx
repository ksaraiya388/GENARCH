import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getAllCommunityRegions } from "@/lib/data";
import { CommunityRegionsList } from "@/components/CommunityRegionsList";

export default function CommunityPage() {
  const regions = getAllCommunityRegions();

  const regionSummaries = regions.map((r) => ({
    region_id: r.region_id,
    name: r.name,
    geo_level: r.geo_level,
    health_stats_count: r.health_stats?.length ?? 0,
    exposure_layers_count: r.exposure_layers?.length ?? 0,
    last_updated: r.last_updated ?? "",
  }));

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Community Module" }]} />
      <header>
        <h1 className="text-h1 text-genarch-text">Community Module</h1>
        <p className="mt-2 text-genarch-subtext max-w-2xl">
          Hyper-local exposure and health burden overlays with interpretable
          models. Population-level estimates for educational purposes only.
        </p>
      </header>

      <CommunityRegionsList regions={regionSummaries} />
    </div>
  );
}
