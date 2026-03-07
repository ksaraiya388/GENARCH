"use client";

import { useState } from "react";
import Link from "next/link";

export interface RegionSummary {
  slug: string;
  region_id: string;
  name: string;
  geo_level: string;
  health_stats_count: number;
  exposure_layers_count: number;
  last_updated: string;
}

export interface CommunityRegionsListProps {
  regions: RegionSummary[];
}

function formatRegionDate(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
}

export function CommunityRegionsList({ regions }: CommunityRegionsListProps) {
  const [search, setSearch] = useState("");

  const filteredRegions = regions.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.region_id.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="search-regions-heading" className="max-w-xl">
        <h2 id="search-regions-heading" className="text-h2 text-surface-white mb-3">
          Search Regions
        </h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by region name or ID..."
          className="w-full border border-white/[0.06] bg-navy-mid rounded-md px-4 py-2.5 text-surface-white placeholder:text-cool-mid focus:outline-none focus:ring-2 focus:ring-teal-primary/50"
          aria-label="Search regions"
        />
      </section>

      <section aria-labelledby="regions-list-heading">
        <h2 id="regions-list-heading" className="text-h2 text-surface-white mb-4">
          Available Regions
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
          {filteredRegions.map((region) => {
            const formattedDate = formatRegionDate(region.last_updated);
            return (
              <Link
                key={region.slug}
                href={`/community/${region.slug}/`}
                className="block no-underline rounded-lg border border-white/[0.08] bg-navy-mid/80 p-5 transition-all hover:border-teal-primary/30 hover:bg-navy-mid focus:outline-none focus:ring-2 focus:ring-teal-primary/50"
              >
                <h3 className="text-lg font-semibold text-surface-white mb-1">
                  {region.name}
                </h3>
                <p className="text-sm text-cool-mid capitalize mb-4">
                  {region.geo_level}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cool-light">
                  <span>{region.health_stats_count} health metrics</span>
                  <span>{region.exposure_layers_count} exposure layers</span>
                </div>
                {formattedDate && (
                  <p className="text-xs text-cool-mid mt-3 pt-3 border-t border-white/[0.06]">
                    Updated {formattedDate}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        {filteredRegions.length === 0 && (
          <p className="text-cool-light italic py-6">
            No regions match your search.
          </p>
        )}
      </section>
    </div>
  );
}
