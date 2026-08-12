"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CommunityRegion } from "@/lib/types";
// Type-only import: erased at build, so it does not affect the dynamic import("leaflet")
// used to keep Leaflet out of the server bundle.
import type { Map as LeafletMapType, Path, Layer, PathOptions } from "leaflet";

import "leaflet/dist/leaflet.css";

// Fallback center (Loudoun County) used only if a region has no geometry file and
// therefore no bounds to fit to. When geometry loads, we fitBounds() to it instead,
// so this hardcoded value never drives the view for a region that has a boundary.
const DEFAULT_MAP_CENTER: [number, number] = [39.08, -77.64];
const DEFAULT_MAP_ZOOM = 10;

// Choropleth fill tokens — drawn from tailwind.config.ts. Teal is a magnitude-neutral
// brand hue here; we deliberately avoid direction.amplify (#C53030) / direction.buffer
// (#2F855A), which carry amplify/buffer semantics elsewhere in the atlas. direction.unknown
// (#A0AEC0) is the "no data" token.
const FILL_COLOR = "#1FAFA0"; // teal-soft
const STROKE_COLOR = "#2DD4BF"; // teal-primary
const NO_DATA_COLOR = "#A0AEC0"; // direction.unknown

type FeatureProps = { GEOID?: string; NAME?: string; region_id?: string } | null;

export interface CommunityRegionDetailProps {
  region: CommunityRegion;
}

type ExposureLayerT = CommunityRegion["exposure_layers"][number];

/** Render a layer's county-level summary_stats as "label: value unit" strings. */
function statLines(layer: ExposureLayerT | undefined): string[] {
  if (!layer?.summary_stats) return [];
  const unit = layer.unit ? ` ${layer.unit}` : "";
  return Object.entries(layer.summary_stats).map(
    ([k, v]) => `${k.replace(/_/g, " ")}: ${v}${unit}`
  );
}

type HealthStatT = CommunityRegion["health_stats"][number];
type ComparisonTier = { label: string; value: number; className: string };

/** Every comparison tier carried by the data, in fixed order. */
function buildComparisonTiers(stat: HealthStatT): ComparisonTier[] {
  const tiers: ComparisonTier[] = [
    { label: "Region", value: stat.value, className: "bg-teal-primary" },
  ];
  if (stat.comparison_state != null)
    tiers.push({ label: "State", value: stat.comparison_state, className: "bg-teal-soft" });
  if (stat.comparison_national != null)
    tiers.push({ label: "National", value: stat.comparison_national, className: "bg-cool-mid" });
  return tiers;
}

/**
 * Build-time guard. A comparison tier or confidence interval that exists in the data and is
 * not rendered is a build error, not a styling choice: quoting one comparator while a less
 * favourable one is silently dropped is the presentational failure this check exists to
 * prevent.
 */
function assertComparisonCompleteness(stat: HealthStatT, tiers: ComparisonTier[]): void {
  const expected = 1 +
    (stat.comparison_state != null ? 1 : 0) +
    (stat.comparison_national != null ? 1 : 0);
  if (tiers.length !== expected) {
    throw new Error(
      `Health-burden completeness: ${stat.disease_slug}/${stat.metric_type} carries ${expected} comparison tier(s) but ${tiers.length} would render.`
    );
  }
  const hasCi = stat.ci_lower != null && stat.ci_upper != null;
  if ((stat.ci_lower != null) !== (stat.ci_upper != null)) {
    throw new Error(
      `Health-burden completeness: ${stat.disease_slug}/${stat.metric_type} has a half-specified confidence interval (ci_lower=${stat.ci_lower}, ci_upper=${stat.ci_upper}).`
    );
  }
  void hasCi;
}

/**
 * Neutral one-line summary, generated from the data. Emitted only when the region value sits
 * below one comparator and above another -- the case where quoting a single comparator would
 * be technically true and presentationally selective.
 */
function comparisonSummary(
  regionName: string,
  stat: HealthStatT,
  tiers: ComparisonTier[]
): string | null {
  const comparators = tiers.filter((t) => t.label !== "Region");
  const below = comparators.filter((c) => stat.value < c.value);
  const above = comparators.filter((c) => stat.value > c.value);
  if (below.length === 0 || above.length === 0) return null;
  const name = (t: ComparisonTier) => t.label.toLowerCase();
  return `${regionName} is below the ${below.map(name).join(" and ")} rate and above the ${above
    .map(name)
    .join(" and ")} rate for this measure.`;
}

export function CommunityRegionDetail({ region }: CommunityRegionDetailProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMapType | null>(null);

  const layers = region.exposure_layers ?? [];
  // Default: first layer in the array (never hardcoded to a specific layer name).
  const [selectedLayer, setSelectedLayer] = useState<string>(
    () => layers[0]?.layer_name ?? ""
  );
  const [panelFeature, setPanelFeature] = useState<FeatureProps>(null);
  const [geoStatus, setGeoStatus] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );

  const activeLayer = layers.find((l) => l.layer_name === selectedLayer);
  const activeHasData = !!activeLayer?.summary_stats &&
    Object.keys(activeLayer.summary_stats).length > 0;

  // Escape closes the detail panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelFeature(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Initialize the map and load this region's real county boundary. Region-agnostic:
  // the geometry file is keyed by region_id, and the join to data is explicit —
  // region.fips_code === feature.properties.GEOID (we fetch one county per file, so
  // the file IS this region's polygon).
  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;
    const container = mapRef.current;
    let cancelled = false;

    setGeoStatus("loading");
    setPanelFeature(null);

    import("leaflet").then((mod) => {
      if (cancelled || !container.parentElement) return;
      const L = mod.default;
      const map = L.map(container).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const baseStyle: PathOptions = {
        color: STROKE_COLOR,
        weight: 2,
        fillColor: FILL_COLOR,
        fillOpacity: 0.35,
      };

      fetch(`/geo/${region.region_id}.geojson`)
        .then((r) => {
          if (!r.ok) throw new Error(`geometry ${r.status}`);
          return r.json();
        })
        .then((geojson) => {
          if (cancelled) return;
          const gLayer = L.geoJSON(geojson, {
            style: () => baseStyle,
            onEachFeature: (feature, layer: Layer) => {
              const path = layer as Path;
              path.on("mouseover", () => path.setStyle({ ...baseStyle, weight: 4 }));
              path.on("mouseout", () => path.setStyle(baseStyle));
              path.on("click", () =>
                setPanelFeature((feature.properties ?? null) as FeatureProps)
              );
            },
          }).addTo(map);
          map.fitBounds(gLayer.getBounds(), { padding: [12, 12] });
          setGeoStatus("ready");
        })
        .catch(() => {
          if (!cancelled) setGeoStatus("unavailable");
        });
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // Re-init only when the region changes.
  }, [region.region_id]);

  const featureName = panelFeature?.NAME ?? panelFeature?.GEOID ?? region.name;

  return (
    <div className="space-y-8">
      <section aria-labelledby="map-heading" className="overflow-hidden">
        <h2 id="map-heading" className="text-h2 text-surface-white mb-3">
          Map
        </h2>

        <div
          className="relative w-full rounded-lg border border-white/[0.08] bg-navy-mid"
          style={{ height: "360px" }}
        >
          <div
            ref={mapRef}
            className="absolute inset-0 z-0 h-full w-full rounded-lg"
            style={{ minHeight: "360px" }}
            role="group"
            aria-label={`County boundary map for ${region.name}. Active exposure layer: ${
              selectedLayer || "none"
            }.`}
          />

          {geoStatus === "unavailable" && (
            <div className="absolute inset-x-0 bottom-0 z-[500] m-2 rounded bg-navy-deep/90 px-3 py-2 text-xs text-cool-light">
              County boundary unavailable. Verify{" "}
              <code className="text-cool-mid">/geo/{region.region_id}.geojson</code> exists.
            </div>
          )}

          {/* Feature detail panel (Phase 4). Overlay so hover/open causes no layout shift. */}
          {panelFeature && (
            <div
              role="region"
              aria-label={`Details for ${featureName}, layer ${selectedLayer}`}
              className="absolute right-0 top-0 z-[1100] h-full w-72 max-w-[85%] overflow-y-auto rounded-r-lg border-l border-white/[0.08] bg-navy-deep/95 p-4 backdrop-blur-sm animate-fade-in"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-h3 text-surface-white">{featureName}</h3>
                <button
                  type="button"
                  onClick={() => setPanelFeature(null)}
                  aria-label="Close details (Escape)"
                  className="rounded px-2 text-cool-mid hover:text-surface-white"
                >
                  ✕
                </button>
              </div>
              {panelFeature?.GEOID && (
                <p className="mt-1 text-xs text-cool-mid">FIPS / GEOID: {panelFeature.GEOID}</p>
              )}

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-cool-mid">
                  Selected layer
                </p>
                <p className="text-sm font-medium text-surface-white">{selectedLayer}</p>
                {activeHasData ? (
                  <ul className="mt-1 space-y-0.5 text-sm text-cool-light">
                    {statLines(activeLayer).map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-cool-mid">No data for this layer.</p>
                )}
                {activeLayer && (
                  <p className="mt-1 text-xs text-cool-mid">
                    {activeLayer.data_source} ({activeLayer.year})
                  </p>
                )}
              </div>

              {layers.filter((l) => l.layer_name !== selectedLayer).length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-cool-mid">
                    Other layers (county-level)
                  </p>
                  <ul className="mt-1 space-y-2 text-sm text-cool-light">
                    {layers
                      .filter((l) => l.layer_name !== selectedLayer)
                      .map((l) => (
                        <li key={l.layer_name}>
                          <span className="text-surface-white">{l.layer_name}</span>
                          {statLines(l).length > 0 ? (
                            <span className="text-cool-mid"> — {statLines(l).join("; ")}</span>
                          ) : (
                            <span className="text-cool-mid"> — no data</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-cool-mid">
                Values are county-level. No sub-county (tract) breakdown is available in
                current data, so no per-feature model / SHAP values are shown here.
              </p>
            </div>
          )}
        </div>

        {/* Legend (Phase 3) — regenerated entirely from the selected layer. */}
        {activeLayer && (
          <div className="mt-3 rounded-lg border border-white/[0.08] bg-navy-mid p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-surface-white">
                {activeLayer.layer_name}
                {activeLayer.unit && (
                  <span className="ml-1 font-normal text-cool-mid">({activeLayer.unit})</span>
                )}
              </h3>
              <span className="text-xs text-cool-mid">
                {activeLayer.data_source} · {activeLayer.year}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className="inline-block h-4 w-6 rounded-sm border border-white/20"
                style={{
                  backgroundColor: activeHasData ? FILL_COLOR : NO_DATA_COLOR,
                  opacity: activeHasData ? 0.6 : 1,
                }}
                aria-hidden="true"
              />
              <span className="text-sm text-cool-light">
                {activeHasData ? statLines(activeLayer).join(" · ") : "No data"}
              </span>
            </div>

            <p className="mt-3 text-xs text-cool-mid">
              County-level resolution. No sub-county variation available in current data.
              Classification: single county-level value (no quantile classification — one
              feature).
            </p>
          </div>
        )}
      </section>

      {layers.length > 0 && (
        <section aria-labelledby="exposure-layers-heading">
          <h2 id="exposure-layers-heading" className="text-h2 text-surface-white mb-3">
            Exposure Layers
          </h2>
          {/* Single-select: three layers in different units cannot color one map at once. */}
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-2 text-sm text-cool-light">Choropleth layer</legend>
            {layers.map((layer) => (
              <label
                key={layer.layer_name}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="choropleth-layer"
                  value={layer.layer_name}
                  checked={selectedLayer === layer.layer_name}
                  onChange={() => setSelectedLayer(layer.layer_name)}
                  className="border-white/[0.06]"
                />
                <span className="text-sm text-surface-white">{layer.layer_name}</span>
                <span className="text-xs text-cool-mid">
                  ({layer.data_source}, {layer.year})
                </span>
              </label>
            ))}
          </fieldset>

          {/* Accessible text-table fallback (Phase 5): Leaflet SVG paths are not natively
              keyboard-focusable, so this table lists every feature and its value for the
              selected layer and provides a keyboard route to the detail panel. */}
          <table className="mt-4 w-full max-w-xl border-collapse text-sm">
            <caption className="sr-only">
              County-level value of {selectedLayer} for {region.name}
            </caption>
            <thead>
              <tr className="border-b border-white/[0.08] text-left text-cool-mid">
                <th scope="col" className="py-2 pr-4 font-medium">Area</th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {selectedLayer}
                  {activeLayer?.unit ? ` (${activeLayer.unit})` : ""}
                </th>
                <th scope="col" className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.04]">
                <td className="py-2 pr-4 text-surface-white">{region.name}</td>
                <td className="py-2 pr-4 text-cool-light">
                  {activeHasData ? statLines(activeLayer).join("; ") : "No data"}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPanelFeature({
                        GEOID: region.fips_code,
                        NAME: region.name,
                        region_id: region.region_id,
                      })
                    }
                    className="text-teal-primary hover:text-teal-soft hover:underline"
                  >
                    View details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {(region.health_stats?.length ?? 0) > 0 && (
        <section aria-labelledby="health-burden-heading">
          <h2 id="health-burden-heading" className="text-h2 text-surface-white mb-3">
            Health Burden (vs State & National)
          </h2>
          <div className="space-y-4">
            {region.health_stats!.map((stat, i) => {
              // Every comparison tier present in the data is rendered, or none is. Built as
              // one array and mapped, so a tier cannot be dropped by editing one branch --
              // selective presentation is structurally impossible, not merely discouraged.
              const tiers = buildComparisonTiers(stat);
              assertComparisonCompleteness(stat, tiers);
              const maxVal = Math.max(...tiers.map((t) => t.value), 1);
              const summary = comparisonSummary(region.name, stat, tiers);
              return (
                <div key={i} className="card">
                  <h3 className="text-h3 text-surface-white mb-1">
                    {stat.disease_slug} — {stat.metric_type}
                  </h3>
                  {stat.unit && (
                    <p className="text-xs text-cool-mid mb-3">
                      Unit: {stat.unit} | Source: {stat.source} ({stat.year})
                    </p>
                  )}
                  {/* items-stretch (not items-end): with items-end each column sizes to
                      content, so the bars' percentage heights resolve against an auto-height
                      parent and collapse to 0px. */}
                  <div className="flex items-stretch gap-2 h-32">
                    {tiers.map((t) => (
                      <div key={t.label} className="flex-1 flex flex-col justify-end items-center">
                        <div
                          className={`w-full max-w-[60px] rounded-t-sm ${t.className}`}
                          style={{ height: `${Math.max(2, (t.value / maxVal) * 80)}%` }}
                          title={`${t.label}: ${t.value}`}
                        />
                        <span className="text-xs mt-2 text-cool-light">{t.label}</span>
                        <span className="text-xs font-medium text-surface-white">{t.value}</span>
                      </div>
                    ))}
                  </div>
                  {summary && (
                    <p className="text-xs text-cool-light mt-3">{summary}</p>
                  )}
                  {stat.ci_lower != null && stat.ci_upper != null && (
                    <p className="text-xs text-cool-mid mt-2">
                      95% CI: [{stat.ci_lower}, {stat.ci_upper}]
                      {stat.comparison_national != null &&
                        stat.comparison_national >= stat.ci_lower &&
                        stat.comparison_national <= stat.ci_upper &&
                        " — this interval overlaps the national value, so the point estimates are not distinguishable at this precision."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {region.model?.shap_summaries && region.model.shap_summaries.length > 0 && (
        <section aria-labelledby="shap-attributions-heading">
          <h2 id="shap-attributions-heading" className="text-h2 text-surface-white mb-3">
            Model Feature Attributions (SHAP)
          </h2>
          {/* constraint-ok: disclaimer denying causation - "not estimates of causal effect" */}
          <p className="text-cool-light text-sm leading-relaxed mb-3 max-w-3xl">
            SHAP values describe how this model weighted each feature when producing its
            prediction on regional training data. They are not estimates of causal effect.
            A feature can carry high attribution because it correlates with variables the
            model does not observe.
          </p>
          <div className="card">
            <ul className="space-y-2">
              {region.model.shap_summaries.map((s, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span className="font-medium text-surface-white">{s.feature}</span>
                  <span
                    style={{
                      color: s.direction === "positive" ? "#C53030" : "#2F855A",
                    }}
                  >
                    {s.direction} attribution (mean SHAP: {s.mean_shap_value.toFixed(3)})
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
