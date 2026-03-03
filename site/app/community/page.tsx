import Link from "next/link";

import { listCommunityRegions } from "@/lib/data";

export default async function CommunityIndexPage(): Promise<JSX.Element> {
  const regions = await listCommunityRegions();
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Community Index</h1>
        <p className="mt-2 text-textSecondary">
          County and regional pages combining exposure overlays, health burden indicators, and transparent
          model explanations.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {regions.map((region) => (
          <Link
            href={`/community/${region.slug}`}
            key={region.slug}
            className="content-card no-underline hover:-translate-y-0.5 transition-transform"
          >
            <h2 className="section-title">{region.name}</h2>
            <p className="mt-1 text-sm text-textSecondary">Geo level: {region.geo_level}</p>
            <p className="mt-2 text-xs text-textSecondary">
              Health indicators: {region.health_stats.length} • Exposure layers: {region.exposure_layers.length}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
