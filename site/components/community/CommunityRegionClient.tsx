"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { FigureExportButtons } from "@/components/charts/FigureExportButtons";
import type { CommunityRegion } from "@/lib/types";

const RegionMap = dynamic(
  () => import("@/components/community/RegionMap").then((module) => module.RegionMap),
  { ssr: false }
);

interface CommunityRegionClientProps {
  region: CommunityRegion;
}

export function CommunityRegionClient({ region }: CommunityRegionClientProps): JSX.Element {
  const [activeLayerName, setActiveLayerName] = useState(region.exposure_layers[0]?.layer_name ?? "");
  const activeLayer =
    region.exposure_layers.find((layer) => layer.layer_name === activeLayerName) ?? region.exposure_layers[0];

  const exposureSummaryData = useMemo(() => {
    const stats = activeLayer?.summary_stats ?? {};
    return Object.entries(stats).map(([key, value]) => ({
      feature: key,
      value: Number(value) || 0
    }));
  }, [activeLayer]);

  const shapData = region.model.shap_summaries.map((item) => ({
    feature: item.feature,
    impact: item.impact
  }));

  const hotspotPoints = (
    region.model.hotspot_scores_geojson.features as Array<
      GeoJSON.Feature<GeoJSON.Geometry, { hotspot_score?: number; subregion?: string }>
    >
  ).map((feature) => ({
    area: String(feature.properties?.subregion ?? "Subregion"),
    score: Number(feature.properties?.hotspot_score ?? 0)
  }));

  return (
    <div className="space-y-6">
      <section className="content-card">
        <h2 className="section-title">Map and exposure layer controls</h2>
        <label className="mt-3 block text-sm text-textSecondary">
          Exposure layer
          <select
            className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-textPrimary"
            value={activeLayerName}
            onChange={(event) => setActiveLayerName(event.target.value)}
          >
            {region.exposure_layers.map((layer) => (
              <option key={layer.layer_name} value={layer.layer_name}>
                {layer.layer_name} ({layer.year})
              </option>
            ))}
          </select>
        </label>
        {activeLayer ? <div className="mt-4">{<RegionMap geojson={activeLayer.geojson} />}</div> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Health burden chart</h2>
          <div id="community-health-chart" className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={region.health_stats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="disease_slug" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#D3B3D3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <FigureExportButtons svgContainerId="community-health-chart" filenameBase={`${region.slug}-health`} />
        </div>
        <div className="content-card">
          <h2 className="section-title">Exposure summary chart</h2>
          <div id="community-exposure-chart" className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exposureSummaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="feature" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#89E5E6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <FigureExportButtons
            svgContainerId="community-exposure-chart"
            filenameBase={`${region.slug}-exposure`}
          />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="content-card">
          <h2 className="section-title">Drivers panel (SHAP)</h2>
          <div id="community-shap-chart" className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ left: 45 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="feature" type="category" width={130} />
                <Tooltip />
                <Bar dataKey="impact" fill="#F5C75A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <FigureExportButtons svgContainerId="community-shap-chart" filenameBase={`${region.slug}-shap`} />
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-textSecondary">
            {region.model.shap_summaries.map((item) => (
              <li key={item.feature}>{item.plain_language}</li>
            ))}
          </ul>
        </div>
        <div className="content-card">
          <h2 className="section-title">Hotspot scores</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-200 px-3 py-2">Subregion</th>
                  <th className="border border-slate-200 px-3 py-2">Relative modeled burden (0-1)</th>
                </tr>
              </thead>
              <tbody>
                {hotspotPoints.map((point) => (
                  <tr key={point.area}>
                    <td className="border border-slate-200 px-3 py-2">{point.area}</td>
                    <td className="border border-slate-200 px-3 py-2">{point.score.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-textSecondary">
            Neutral language only: values represent relative modeled burden, not diagnosis or personal risk.
          </p>
        </div>
      </section>
    </div>
  );
}
