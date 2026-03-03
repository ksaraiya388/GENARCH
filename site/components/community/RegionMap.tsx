"use client";

import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";

interface RegionMapProps {
  geojson: GeoJSON.FeatureCollection;
}

function getCenter(geojson: GeoJSON.FeatureCollection): [number, number] {
  const firstFeature = geojson.features[0];
  if (!firstFeature?.geometry) return [39.05, -77.6];

  if (firstFeature.geometry.type === "Point") {
    const [lon, lat] = firstFeature.geometry.coordinates as [number, number];
    return [lat, lon];
  }

  if (firstFeature.geometry.type === "Polygon") {
    const ring = firstFeature.geometry.coordinates[0];
    const [lon, lat] = ring[Math.floor(ring.length / 2)] as [number, number];
    return [lat, lon];
  }

  return [39.05, -77.6];
}

export function RegionMap({ geojson }: RegionMapProps): JSX.Element {
  const center = getCenter(geojson);
  return (
    <div className="h-80 w-full overflow-hidden rounded-card border border-slate-200">
      <MapContainer center={center} zoom={10} className="h-full w-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON
          data={geojson}
          style={(feature) => {
            const pm25 = Number(feature?.properties?.pm25 ?? 8.0);
            const intensity = Math.min(1, Math.max(0, (pm25 - 6) / 10));
            return {
              color: "#663366",
              weight: 1.2,
              fillColor: `rgba(211, 179, 211, ${0.25 + intensity * 0.55})`,
              fillOpacity: 0.8
            };
          }}
          onEachFeature={(feature, layer) => {
            const name = String(feature.properties?.name ?? "Region");
            const pm25 = String(feature.properties?.pm25 ?? "N/A");
            const industrial = String(feature.properties?.industrial_proximity ?? "N/A");
            layer.bindPopup(
              `${name}<br/>PM2.5: ${pm25}<br/>Industrial proximity score: ${industrial}`
            );
          }}
        />
      </MapContainer>
    </div>
  );
}
