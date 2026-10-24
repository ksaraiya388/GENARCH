"""Sensor and regulatory rows, built by the pipeline's own readers.

Nothing here parses a file or decides an exclusion. `reshape_deq` owns timestamp
normalisation, deduplication, occupancy, void windows, the PM2.5 end date and the
exact-zero floor; this module only assembles its output for one set of frozen
inputs and raises on an occupancy hard failure.
"""

from __future__ import annotations

from pathlib import Path

from pipeline.reshape_deq import (
    REGULATORY_FILES,
    SITE_HISTORY,
    build_sensor_rows,
    find_transit_sites,
    load_site_history,
    occupancy_by_site,
    read_kunak_file,
    read_regulatory_file,
)


class OccupancyFailure(RuntimeError):
    """A reading fell outside its site's occupancy window. Hard error, never a warning."""


def build_rows(paths: list[Path], site_history: Path | None = None) -> list[dict]:
    """Long-format sensor rows for `paths`, flagged exactly as the pipeline flags them."""
    history = load_site_history(site_history or SITE_HISTORY)
    by_site = occupancy_by_site(history)
    parsed = {}
    for path in sorted(paths, key=lambda p: p.name):
        site_id, records = read_kunak_file(path)
        parsed[site_id] = records
    observed = {site: [r["_ts_raw"] for r in recs] for site, recs in parsed.items()}
    transit, _ = find_transit_sites(history, observed, by_site)

    rows: list[dict] = []
    for site_id in sorted(parsed):
        site_rows, violations = build_sensor_rows(
            site_id, parsed[site_id], by_site[site_id], transit
        )
        hard = [v for v in violations if v["disposition"] == "hard_failure"]
        if hard:
            raise OccupancyFailure(f"{site_id}: {len(hard)} occupancy hard failure(s)")
        rows.extend(site_rows)
    return rows


def build_regulatory_rows(regulatory_dir_lookup) -> list[dict]:
    """Regulatory monitor rows for every hourly FOIA file.

    `regulatory_dir_lookup` maps a filename to a verified path, so every read still
    goes through the freeze.
    """
    rows: list[dict] = []
    for filename, pollutant in REGULATORY_FILES:
        rows.extend(read_regulatory_file(regulatory_dir_lookup(filename), pollutant))
    return rows
