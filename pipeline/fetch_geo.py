"""Fetch real county boundary geometry for community regions from U.S. Census TIGERweb.

Community region pages render a county-level map. Rather than hand-drawing polygons
(which would be inaccurate and unverifiable), this script pulls the authoritative
county boundary for each region's FIPS code from the Census Bureau's TIGERweb REST
service and writes one GeoJSON FeatureCollection per region to site/public/geo/.

Run once when a region is added or its geometry needs refreshing:

    python -m pipeline.fetch_geo

The resulting .geojson files are committed to the repo; the site build never fetches
anything (the static export stays network-free). Geometry is region-agnostic: this
loops over every data/community/*.json and keys off region_id + fips_code.

Provenance (origin URL, download date, license) is recorded in
pipeline/sources/manifest.json. TIGER/Line and TIGERweb data are public domain
(U.S. Government works, not copyrighted).
"""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# TIGERweb "State_County" MapServer, layer 1 = Counties. Verified to return a
# detailed WGS84 (outSR=4326) Polygon FeatureCollection when queried by GEOID.
TIGERWEB_COUNTY_QUERY = (
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/"
    "State_County/MapServer/1/query"
)


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def _fetch_county_geojson(fips_code: str) -> dict:
    """Fetch a single county's boundary from TIGERweb as a GeoJSON dict."""
    params = {
        "where": f"GEOID='{fips_code}'",
        "outFields": "GEOID,NAME",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
    }
    url = f"{TIGERWEB_COUNTY_QUERY}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "genarch-pipeline"})
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (trusted gov host)
        return json.loads(resp.read().decode("utf-8"))


def _count_coord_pairs(coords: object) -> int:
    """Recursively count [lon, lat] pairs in a GeoJSON coordinate array."""
    if isinstance(coords, list):
        if coords and isinstance(coords[0], (int, float)):
            return 1
        return sum(_count_coord_pairs(c) for c in coords)
    return 0


def _region_files(root: Path) -> list[Path]:
    return sorted((root / "data" / "community").glob("*.json"))


def fetch_all() -> int:
    """Fetch geometry for every community region. Returns process exit code."""
    root = _repo_root()
    out_dir = root / "site" / "public" / "geo"
    out_dir.mkdir(parents=True, exist_ok=True)

    region_files = _region_files(root)
    if not region_files:
        print("ERROR: no community region files found under data/community/", file=sys.stderr)
        return 1

    written: list[str] = []
    for fp in region_files:
        region = json.loads(fp.read_text(encoding="utf-8"))
        region_id = region.get("region_id")
        fips_code = region.get("fips_code")
        if not region_id or not fips_code:
            print(f"SKIP {fp.name}: missing region_id or fips_code", file=sys.stderr)
            continue

        try:
            raw = _fetch_county_geojson(fips_code)
        except Exception as e:  # noqa: BLE001 - network is the only realistic failure
            print(
                f"ERROR: could not fetch geometry for {region_id} (FIPS {fips_code}) "
                f"from TIGERweb: {e}\n"
                f"       STOP: do not hand-write geometry. Retry when the host is reachable:\n"
                f"       {TIGERWEB_COUNTY_QUERY}?where=GEOID='{fips_code}'"
                f"&outFields=GEOID,NAME&returnGeometry=true&outSR=4326&f=geojson",
                file=sys.stderr,
            )
            return 1

        features = raw.get("features") or []
        if not features:
            print(f"ERROR: TIGERweb returned no feature for FIPS {fips_code}", file=sys.stderr)
            return 1

        # We fetch exactly one county per region, so the join is explicit and trivial:
        # the file IS this region's polygon. Stamp identity ourselves so the frontend
        # can join region.fips_code -> feature.properties.GEOID deterministically.
        geometry = features[0].get("geometry")
        name = (features[0].get("properties") or {}).get("NAME") or region.get("name")
        feature_collection = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "GEOID": fips_code,
                        "NAME": name,
                        "region_id": region_id,
                    },
                    "geometry": geometry,
                }
            ],
        }

        out_path = out_dir / f"{region_id}.geojson"
        out_path.write_text(
            json.dumps(feature_collection, ensure_ascii=False), encoding="utf-8"
        )
        n_pairs = _count_coord_pairs(geometry.get("coordinates", [])) if geometry else 0
        gtype = geometry.get("type") if geometry else "?"
        written.append(
            f"  {out_path.relative_to(root)}  (GEOID {fips_code}, {gtype}, {n_pairs} coordinate pairs)"
        )

    print("Wrote county geometry:")
    print("\n".join(written))
    return 0


if __name__ == "__main__":
    sys.exit(fetch_all())
