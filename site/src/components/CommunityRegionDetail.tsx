"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CommunityRegion } from "@/lib/types";

import "leaflet/dist/leaflet.css";

// Default center for Loudoun County, Virginia (fallback when region has no bounds)
const DEFAULT_MAP_CENTER: [number, number] = [39.08, -77.64];
const DEFAULT_MAP_ZOOM = 10;

export interface CommunityRegionDetailProps {
  region: CommunityRegion;
}

export function CommunityRegionDetail({ region }: CommunityRegionDetailProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [exposureLayers, setExposureLayers] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        (region.exposure_layers ?? []).map((l) => [l.layer_name, true])
      )
  );

  const mapInstanceRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const container = mapRef.current;
    import("leaflet").then((L) => {
      if (!container.parentElement) return;
      const map = L.default.map(container).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      mapInstanceRef.current = map;
      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const stateComparison = 10.5;
  const nationalComparison = 9.8;

  return (
    <div className="space-y-8">
      <section aria-labelledby="map-heading" className="overflow-hidden">
        <h2 id="map-heading" className="text-h2 text-surface-white mb-3">
          Map
        </h2>
        <div className="relative w-full rounded-lg border border-white/[0.08] bg-navy-mid" style={{ height: "320px" }}>
          <div
            ref={mapRef}
            className="absolute inset-0 z-0 h-full w-full rounded-lg"
            style={{ minHeight: "320px" }}
            aria-label="Region map"
          />
        </div>
      </section>

      {(region.exposure_layers?.length ?? 0) > 0 && (
        <section aria-labelledby="exposure-layers-heading">
          <h2 id="exposure-layers-heading" className="text-h2 text-surface-white mb-3">
            Exposure Layers
          </h2>
          <div className="flex flex-wrap gap-4">
            {region.exposure_layers!.map((layer) => (
              <label
                key={layer.layer_name}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={exposureLayers[layer.layer_name] ?? false}
                  onChange={(e) =>
                    setExposureLayers((prev) => ({
                      ...prev,
                      [layer.layer_name]: e.target.checked,
                    }))
                  }
                  className="rounded border-white/[0.06]"
                />
                <span className="text-sm text-surface-white">
                  {layer.layer_name}
                </span>
                <span className="text-xs text-cool-mid">
                  ({layer.data_source}, {layer.year})
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {(region.health_stats?.length ?? 0) > 0 && (
        <section aria-labelledby="health-burden-heading">
          <h2 id="health-burden-heading" className="text-h2 text-surface-white mb-3">
            Health Burden (vs State & National)
          </h2>
          <div className="space-y-4">
            {region.health_stats!.map((stat, i) => (
              <div key={i} className="card">
                <h3 className="text-h3 text-surface-white mb-3">
                  {stat.disease_slug} — {stat.metric_type}
                </h3>
                <div className="flex items-end gap-2 h-24">
                  <div className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full max-w-[60px] bg-teal-primary rounded-t-sm"
                      style={{
                        height: `${Math.min(100, (stat.value / 25) * 100)}%`,
                      }}
                      title={`Region: ${stat.value}`}
                    />
                    <span className="text-xs mt-2 text-cool-light">Region</span>
                    <span className="text-xs font-medium text-surface-white">{stat.value}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full max-w-[60px] bg-teal-soft rounded-t-sm"
                      style={{
                        height: `${Math.min(100, (stateComparison / 25) * 100)}%`,
                      }}
                      title={`State: ${stateComparison}`}
                    />
                    <span className="text-xs mt-2 text-cool-light">State</span>
                    <span className="text-xs font-medium text-surface-white">{stateComparison}</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full max-w-[60px] bg-cool-mid rounded-t-sm"
                      style={{
                        height: `${Math.min(100, (nationalComparison / 25) * 100)}%`,
                      }}
                      title={`National: ${nationalComparison}`}
                    />
                    <span className="text-xs mt-2 text-cool-light">National</span>
                    <span className="text-xs font-medium text-surface-white">{nationalComparison}</span>
                  </div>
                </div>
                {stat.ci_lower != null && stat.ci_upper != null && (
                  <p className="text-xs text-cool-mid mt-2">
                    95% CI: [{stat.ci_lower}, {stat.ci_upper}]
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {region.model?.shap_summaries && region.model.shap_summaries.length > 0 && (
        <section aria-labelledby="shap-drivers-heading">
          <h2 id="shap-drivers-heading" className="text-h2 text-surface-white mb-3">
            Model Drivers (SHAP)
          </h2>
          <div className="card">
            <ul className="space-y-2">
              {region.model.shap_summaries.map((s, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span className="font-medium text-surface-white">{s.feature}</span>
                  <span
                    className={
                      s.direction === "positive"
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {s.direction} (mean SHAP: {s.mean_shap_value.toFixed(3)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {region.model && (
        <section aria-labelledby="model-card-heading">
          <h2 id="model-card-heading" className="text-h2 text-surface-white mb-3">
            Model Card
          </h2>
          <div className="card">
            <dl className="grid gap-2 sm:grid-cols-2">
              <dt className="text-cool-mid">Version</dt>
              <dd className="text-surface-white">{region.model.model_card_version}</dd>
              <dt className="text-cool-mid">Training cutoff</dt>
              <dd className="text-surface-white">{region.model.training_data_cutoff}</dd>
              <dt className="text-cool-mid">Features used</dt>
              <dd className="text-surface-white">{(region.model.features_used ?? []).join(", ")}</dd>
            </dl>
            <Link href="/methods/" className="text-teal-primary text-sm mt-4 inline-block hover:text-teal-soft hover:underline">
              Full model card →
            </Link>
          </div>
        </section>
      )}

      {(region.resources?.length ?? 0) > 0 && (
        <section aria-labelledby="resources-heading">
          <h2 id="resources-heading" className="text-h2 text-surface-white mb-3">
            Educational Resources
          </h2>
          <ul className="space-y-2">
            {region.resources!.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-primary hover:text-teal-soft hover:underline"
                >
                  {r.name}
                </a>
                {r.description && (
                  <span className="text-cool-mid text-sm ml-2">
                    — {r.description}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
