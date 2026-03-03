"use client";

import { useState } from "react";
import Link from "next/link";

export interface RegionSummary {
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

export function CommunityRegionsList({ regions }: CommunityRegionsListProps) {
  const [search, setSearch] = useState("");

  const filteredRegions = regions.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.region_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <section aria-labelledby="search-regions-heading">
        <h2 id="search-regions-heading" className="text-h2 text-surface-white mb-3">
          Search Regions
        </h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by region name or ID..."
          className="w-full max-w-md border border-white/[0.06] bg-navy-mid rounded-sm px-4 py-2 text-surface-white placeholder:text-cool-mid"
          aria-label="Search regions"
        />
      </section>

      <section aria-labelledby="regions-list-heading">
        <h2 id="regions-list-heading" className="text-h2 text-surface-white mb-4">
          Available Regions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRegions.map((region) => (
            <Link
              key={region.region_id}
              href={`/community/${region.region_id}/`}
              className="card block no-underline transition-shadow hover:shadow-md"
            >
              <h3 className="text-h3 text-surface-white mb-2">{region.name}</h3>
              <p className="text-sm text-cool-light mb-3 capitalize">
                {region.geo_level}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-cool-mid">
                <span>{region.health_stats_count} health metrics</span>
                <span>{region.exposure_layers_count} exposure layers</span>
              </div>
              {region.last_updated && (
                <p className="text-xs text-cool-mid mt-2">
                  Updated{" "}
                  {new Date(region.last_updated).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
        {filteredRegions.length === 0 && (
          <p className="text-cool-light italic">
            No regions match your search.
          </p>
        )}
      </section>
    </>
  );
}
